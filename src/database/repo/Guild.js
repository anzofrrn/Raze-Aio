import { Database } from "#structures/classes/Database";
import { config } from "#config/config";
import { logger } from "#utils/logger";

export class Guild extends Database {
  constructor() {
    super(config.database.guild);
    this.initTable();
  }

  initTable() {
    this.exec(`
      CREATE TABLE IF NOT EXISTS guilds (
        id TEXT PRIMARY KEY,
        prefixes TEXT,
        default_volume INTEGER DEFAULT 100,
        blacklisted BOOLEAN DEFAULT FALSE,
        blacklist_reason TEXT DEFAULT NULL,
        auto_disconnect BOOLEAN DEFAULT TRUE,
        stay_247 BOOLEAN DEFAULT FALSE,
        stay_247_voice_channel TEXT DEFAULT NULL,
        stay_247_text_channel TEXT DEFAULT NULL,
        bot_nick TEXT DEFAULT NULL,
        bot_bio TEXT DEFAULT NULL,
        bot_avatar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing tables that don't have branding columns
    try {
      this.exec(`ALTER TABLE guilds ADD COLUMN bot_nick TEXT DEFAULT NULL`);
    } catch (_) {}
    try {
      this.exec(`ALTER TABLE guilds ADD COLUMN bot_bio TEXT DEFAULT NULL`);
    } catch (_) {}
    try {
      this.exec(`ALTER TABLE guilds ADD COLUMN bot_avatar TEXT DEFAULT NULL`);
    } catch (_) {}
  }

  getGuild(guildId) {
    if (!guildId) return null;
    return this.get("SELECT * FROM guilds WHERE id = ?", [guildId]);
  }

  ensureGuild(guildId) {
    if (!guildId) {
      const errorMessage = `[GuildDB] A valid guildId must be provided to ensureGuild. Received: ${guildId}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    let guild = this.getGuild(guildId);
    const defaultPrefix = JSON.stringify([config.prefix]);

    if (!guild) {
      this.exec(
        "INSERT INTO guilds (id, prefixes, default_volume, auto_disconnect, stay_247, stay_247_voice_channel, stay_247_text_channel) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [guildId, defaultPrefix, 100, 1, 0, null, null]
      );
      return this.getGuild(guildId);
    }

    let needsUpdate = false;
    const updates = {};

    if (!guild.prefixes) { updates.prefixes = defaultPrefix; needsUpdate = true; }
    if (guild.default_volume === null || guild.default_volume === undefined) { updates.default_volume = 100; needsUpdate = true; }
    if (guild.auto_disconnect === null || guild.auto_disconnect === undefined) { updates.auto_disconnect = 1; needsUpdate = true; }
    if (guild.stay_247 === null || guild.stay_247 === undefined) { updates.stay_247 = 0; needsUpdate = true; }

    if (needsUpdate) {
      const keys = Object.keys(updates);
      const setClause = keys.map(key => `${key} = ?`).join(", ");
      this.exec(`UPDATE guilds SET ${setClause} WHERE id = ?`, [...Object.values(updates), guildId]);
    }

    return this.getGuild(guildId);
  }

  // ── Prefix ──────────────────────────────────────────────────────────────
  getPrefixes(guildId) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.prefixes) return [config.prefix];
    try {
      const prefixes = JSON.parse(guild.prefixes);
      return Array.isArray(prefixes) && prefixes.length > 0 ? prefixes : [config.prefix];
    } catch (_) {
      return [config.prefix];
    }
  }

  setPrefixes(guildId, prefixes) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET prefixes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [JSON.stringify(prefixes), guildId]
    );
  }

  // ── Blacklist ────────────────────────────────────────────────────────────
  isGuildBlacklisted(guildId) {
    const guild = this.getGuild(guildId);
    return guild ? Boolean(guild.blacklisted) : false;
  }

  blacklistGuild(guildId, reason = null) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET blacklisted = 1, blacklist_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [reason, guildId]
    );
  }

  unblacklistGuild(guildId) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET blacklisted = 0, blacklist_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [guildId]
    );
  }

  // ── Volume ───────────────────────────────────────────────────────────────
  getDefaultVolume(guildId) {
    const guild = this.getGuild(guildId);
    return guild?.default_volume ?? 100;
  }

  setDefaultVolume(guildId, volume) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET default_volume = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [volume, guildId]
    );
  }

  // ── 24/7 ─────────────────────────────────────────────────────────────────
  getStay247(guildId) {
    const guild = this.getGuild(guildId);
    return { enabled: Boolean(guild?.stay_247), voiceChannelId: guild?.stay_247_voice_channel, textChannelId: guild?.stay_247_text_channel };
  }

  setStay247(guildId, enabled, voiceChannelId = null, textChannelId = null) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET stay_247 = ?, stay_247_voice_channel = ?, stay_247_text_channel = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [enabled ? 1 : 0, voiceChannelId, textChannelId, guildId]
    );
  }

  // ── Per-server Branding ───────────────────────────────────────────────────
  getBranding(guildId) {
    const guild = this.getGuild(guildId);
    return {
      nick: guild?.bot_nick || null,
      bio: guild?.bot_bio || null,
      avatar: guild?.bot_avatar || null,
    };
  }

  setBotNick(guildId, nick) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET bot_nick = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [nick, guildId]
    );
  }

  setBotBio(guildId, bio) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET bot_bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [bio, guildId]
    );
  }

  setBotAvatar(guildId, avatarUrl) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET bot_avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [avatarUrl, guildId]
    );
  }

  // ── Misc ─────────────────────────────────────────────────────────────────
  getAllGuilds() {
    return this.all("SELECT * FROM guilds") || [];
  }

  getValid247Guilds() {
    return this.all(
      "SELECT * FROM guilds WHERE stay_247 = 1 AND stay_247_voice_channel IS NOT NULL"
    ) || [];
  }

  set247Mode(guildId, enabled, voiceChannelId = null, textChannelId = null) {
    this.ensureGuild(guildId);
    if (!enabled) {
      return this.exec(
        "UPDATE guilds SET stay_247 = 0, stay_247_voice_channel = NULL, stay_247_text_channel = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [guildId]
      );
    }
    return this.exec(
      "UPDATE guilds SET stay_247 = 1, stay_247_voice_channel = ?, stay_247_text_channel = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [voiceChannelId, textChannelId, guildId]
    );
  }

  getAutoDisconnect(guildId) {
    const guild = this.getGuild(guildId);
    return guild ? Boolean(guild.auto_disconnect) : true;
  }

  setAutoDisconnect(guildId, enabled) {
    this.ensureGuild(guildId);
    return this.exec(
      "UPDATE guilds SET auto_disconnect = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [enabled ? 1 : 0, guildId]
    );
  }
}

export default new Guild();
