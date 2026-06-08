import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "#utils/logger";

const STATE_FILE = "./database/data/music-state.json";
const STATE_VERSION = 1;

export class MusicStateManager {
  constructor() {
    this.isBackingUp = false;
    this.isRestoring = false;
    this.ensureDirectory();
  }

  ensureDirectory() {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  atomicWrite(filePath, data) {
    const tempPath = path.join(os.tmpdir(), `music-state-${Date.now()}.tmp`);
    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {}
      throw error;
    }
  }

  async backupAllPlayers(client) {
    if (this.isBackingUp) {
      return { success: false, error: "Backup already in progress" };
    }

    if (!client.music || !client.music.lavalink) {
      logger.error("MusicStateManager", "Music system not initialized");
      return { success: false, error: "Music system not initialized" };
    }

    this.isBackingUp = true;
    const players = [];
    const lavalink = client.music.lavalink;

    try {
      for (const [guildId, player] of lavalink.players) {
        try {
          const currentTrack = player.queue.current;
          const queueTracks = player.queue.tracks || [];

          if (!currentTrack && queueTracks.length === 0) {
            continue;
          }

          const playerState = {
            guildId: guildId,
            voiceChannelId: player.voiceChannelId,
            textChannelId: player.textChannelId,
            volume: player.volume,
            paused: player.paused,
            playing: player.playing,
            position: player.position || 0,
            repeatMode: player.repeatMode,
            currentTrack: currentTrack ? this.serializeTrack(currentTrack) : null,
            queueTracks: queueTracks.map(track => this.serializeTrack(track)),
            previousTracks: (player.queue.previous || []).slice(0, 10).map(track => this.serializeTrack(track)),
            filters: player.filterManager?.data || {},
            is247Mode: player.get("247Mode") || false,
            autoplay: player.get("autoplay") || false,
          };

          players.push(playerState);
          logger.debug("MusicStateManager", `Backed up player for guild ${guildId}`);
        } catch (error) {
          logger.error("MusicStateManager", `Failed to backup player for guild ${guildId}:`, error);
        }
      }

      const backup = {
        version: STATE_VERSION,
        timestamp: Date.now(),
        playerCount: players.length,
        players: players,
      };

      this.atomicWrite(STATE_FILE, backup);
      logger.success("MusicStateManager", `Backed up ${players.length} player(s) to ${STATE_FILE}`);

      return { success: true, count: players.length };
    } catch (error) {
      logger.error("MusicStateManager", "Failed to backup players:", error);
      return { success: false, error: error.message };
    } finally {
      this.isBackingUp = false;
    }
  }

  serializeTrack(track) {
    if (!track) return null;

    return {
      encoded: track.encoded || null,
      info: {
        identifier: track.info?.identifier,
        title: track.info?.title,
        author: track.info?.author,
        duration: track.info?.duration,
        artworkUrl: track.info?.artworkUrl,
        uri: track.info?.uri,
        sourceName: track.info?.sourceName,
        isSeekable: track.info?.isSeekable,
        isStream: track.info?.isStream,
      },
      requester: track.requester ? {
        id: track.requester.id,
        username: track.requester.username,
        tag: track.requester.tag,
      } : null,
    };
  }

  loadBackup() {
    try {
      if (!fs.existsSync(STATE_FILE)) {
        return null;
      }

      const data = fs.readFileSync(STATE_FILE, "utf-8");
      const backup = JSON.parse(data);

      if (!backup.version || backup.version !== STATE_VERSION) {
        logger.warn("MusicStateManager", "Backup version mismatch, skipping restore");
        return null;
      }

      const ageMinutes = (Date.now() - backup.timestamp) / 1000 / 60;
      if (ageMinutes > 30) {
        logger.warn("MusicStateManager", `Backup is ${ageMinutes.toFixed(1)} minutes old, may be stale`);
      }

      return backup;
    } catch (error) {
      logger.error("MusicStateManager", "Failed to load backup:", error);
      return null;
    }
  }

  async restoreAllPlayers(client) {
    if (this.isRestoring) {
      return { success: false, error: "Restore already in progress", restored: 0, failed: 0 };
    }

    const backup = this.loadBackup();
    if (!backup || !backup.players || backup.players.length === 0) {
      return { success: false, error: "No valid backup found", restored: 0, failed: 0 };
    }

    if (!client.music || !client.music.lavalink || !client.music.initialized) {
      return { success: false, error: "Music system not ready", restored: 0, failed: 0 };
    }

    const node = client.music.lavalink.nodeManager.leastUsedNodes("memory")[0];
    if (!node || !node.connected) {
      return { success: false, error: "No connected Lavalink node available", restored: 0, failed: 0 };
    }

    this.isRestoring = true;
    let restored = 0;
    let failed = 0;
    const errors = [];

    try {
      for (const playerState of backup.players) {
        try {
          const result = await this.restorePlayer(client, playerState, node);
          if (result.success) {
            restored++;
          } else {
            failed++;
            errors.push(`${playerState.guildId}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(`${playerState.guildId}: ${error.message}`);
          logger.error("MusicStateManager", `Failed to restore player for guild ${playerState.guildId}:`, error);
        }
      }

      if (restored > 0) {
        this.clearBackup();
      }

      logger.success("MusicStateManager", `Restored ${restored}/${backup.players.length} player(s)`);
      return { success: true, restored, failed, total: backup.players.length, errors };
    } finally {
      this.isRestoring = false;
    }
  }

  async restorePlayer(client, playerState, node) {
    const guild = client.guilds.cache.get(playerState.guildId);
    if (!guild) {
      return { success: false, error: "Guild not found" };
    }

    const voiceChannel = guild.channels.cache.get(playerState.voiceChannelId);
    if (!voiceChannel) {
      return { success: false, error: "Voice channel not found" };
    }

    const textChannel = guild.channels.cache.get(playerState.textChannelId);
    if (!textChannel) {
      return { success: false, error: "Text channel not found" };
    }

    const botMember = guild.members.cache.get(client.user.id);
    if (!voiceChannel.permissionsFor(botMember)?.has(["Connect", "Speak"])) {
      return { success: false, error: "Missing voice permissions" };
    }

    try {
      const player = await client.music.createPlayer({
        guildId: playerState.guildId,
        voiceChannelId: playerState.voiceChannelId,
        textChannelId: playerState.textChannelId,
        volume: playerState.volume,
        selfDeaf: true,
        selfMute: false,
      });

      if (!player) {
        return { success: false, error: "Failed to create player" };
      }

      if (playerState.is247Mode) {
        player.set("247Mode", true);
        player.set("247VoiceChannel", playerState.voiceChannelId);
        player.set("247TextChannel", playerState.textChannelId);
      }

      if (playerState.autoplay) {
        player.set("autoplay", true);
      }

      const tracksToQueue = [];
      let failedTracks = 0;

      if (playerState.currentTrack) {
        const resolvedTrack = await this.resolveTrack(client, node, playerState.currentTrack);
        if (resolvedTrack) {
          tracksToQueue.push(resolvedTrack);
        } else {
          failedTracks++;
          logger.warn("MusicStateManager", `Failed to resolve current track: ${playerState.currentTrack.info?.title}`);
        }
      }

      for (const trackData of playerState.queueTracks) {
        const resolvedTrack = await this.resolveTrack(client, node, trackData);
        if (resolvedTrack) {
          tracksToQueue.push(resolvedTrack);
        } else {
          failedTracks++;
        }
      }

      if (tracksToQueue.length === 0) {
        await player.destroy();
        return { success: false, error: `No tracks could be resolved (${failedTracks} failed)` };
      }

      for (const track of tracksToQueue) {
        player.queue.add(track);
      }

      await player.play({
        paused: playerState.paused,
      });

      if (playerState.position > 0 && playerState.currentTrack && !playerState.currentTrack.info?.isStream) {
        setTimeout(async () => {
          try {
            if (player && player.playing) {
              await player.seek(playerState.position);
            }
          } catch (e) {
            logger.debug("MusicStateManager", `Could not seek to position: ${e.message}`);
          }
        }, 2000);
      }

      if (playerState.repeatMode) {
        player.setRepeatMode(playerState.repeatMode);
      }

      logger.success("MusicStateManager", `Restored player for guild ${playerState.guildId} with ${tracksToQueue.length} track(s) (${failedTracks} failed)`);
      return { success: true, tracksRestored: tracksToQueue.length, tracksFailed: failedTracks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resolveTrack(client, node, trackData) {
    if (!trackData) return null;

    try {
      if (trackData.encoded) {
        try {
          const searchResult = await node.search({ query: trackData.encoded }, trackData.requester);
          if (searchResult?.tracks?.length > 0) {
            const track = searchResult.tracks[0];
            track.requester = trackData.requester;
            return track;
          }
        } catch (e) {
          logger.debug("MusicStateManager", `Encoded track search failed: ${e.message}`);
        }
      }

      if (trackData.info?.uri) {
        try {
          const searchResult = await node.search({ query: trackData.info.uri }, trackData.requester);
          if (searchResult?.tracks?.length > 0) {
            const track = searchResult.tracks[0];
            track.requester = trackData.requester;
            return track;
          }
        } catch (e) {
          logger.debug("MusicStateManager", `URI search failed: ${e.message}`);
        }
      }

      if (trackData.info?.identifier && trackData.info?.sourceName) {
        try {
          let searchQuery;
          const source = trackData.info.sourceName.toLowerCase();
          
          if (source.includes("youtube")) {
            searchQuery = `https://www.youtube.com/watch?v=${trackData.info.identifier}`;
          } else if (source.includes("spotify")) {
            searchQuery = `https://open.spotify.com/track/${trackData.info.identifier}`;
          } else if (source.includes("soundcloud")) {
            searchQuery = trackData.info.uri;
          }

          if (searchQuery) {
            const searchResult = await node.search({ query: searchQuery }, trackData.requester);
            if (searchResult?.tracks?.length > 0) {
              const track = searchResult.tracks[0];
              track.requester = trackData.requester;
              return track;
            }
          }
        } catch (e) {
          logger.debug("MusicStateManager", `Identifier search failed: ${e.message}`);
        }
      }

      if (trackData.info?.title && trackData.info?.author) {
        try {
          const query = `${trackData.info.title} ${trackData.info.author}`;
          const searchResult = await node.search({ query, source: "spsearch" }, trackData.requester);
          if (searchResult?.tracks?.length > 0) {
            const track = searchResult.tracks[0];
            track.requester = trackData.requester;
            return track;
          }
        } catch (e) {
          logger.debug("MusicStateManager", `Title/author search failed: ${e.message}`);
        }
      }

      if (trackData.info?.title) {
        try {
          const searchResult = await node.search({ query: trackData.info.title, source: "ytsearch" }, trackData.requester);
          if (searchResult?.tracks?.length > 0) {
            const track = searchResult.tracks[0];
            track.requester = trackData.requester;
            return track;
          }
        } catch (e) {
          logger.debug("MusicStateManager", `Title-only search failed: ${e.message}`);
        }
      }

      logger.warn("MusicStateManager", `Could not resolve track: ${trackData.info?.title || "Unknown"}`);
      return null;
    } catch (error) {
      logger.error("MusicStateManager", `Error resolving track:`, error);
      return null;
    }
  }

  clearBackup() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
        logger.info("MusicStateManager", "Backup file cleared");
      }
    } catch (error) {
      logger.error("MusicStateManager", "Failed to clear backup:", error);
    }
  }

  hasBackup() {
    return fs.existsSync(STATE_FILE);
  }

  getBackupInfo() {
    const backup = this.loadBackup();
    if (!backup) return null;

    return {
      playerCount: backup.playerCount,
      timestamp: backup.timestamp,
      age: Date.now() - backup.timestamp,
    };
  }
}

export const musicStateManager = new MusicStateManager();
