import { Database } from '#structures/classes/Database';
import { config } from "#config/config";
import { logger } from "#utils/logger";

export class Invites extends Database {
  constructor() {
    super(config.database.invites);
    this.initTables();
  }

  initTables() {
    this.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        tracking_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.exec(`
      CREATE TABLE IF NOT EXISTS invite_ranks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        invites_required INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, role_id)
      )
    `);

    this.exec(`
      CREATE TABLE IF NOT EXISTS member_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tracked INTEGER DEFAULT 0,
        added INTEGER DEFAULT 0,
        fake INTEGER DEFAULT 0,
        left_count INTEGER DEFAULT 0,
        inviter_id TEXT DEFAULT NULL,
        invite_code TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id)
      )
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_member_invites_guild ON member_invites(guild_id)
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_member_invites_user ON member_invites(user_id)
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_invite_ranks_guild ON invite_ranks(guild_id)
    `);

    logger.info('InvitesDatabase', 'Invites tables initialized');
  }

  ensureGuildSettings(guildId) {
    let settings = this.get('SELECT * FROM guild_settings WHERE guild_id = ?', [guildId]);
    if (!settings) {
      this.exec('INSERT INTO guild_settings (guild_id, tracking_enabled) VALUES (?, 0)', [guildId]);
      settings = this.get('SELECT * FROM guild_settings WHERE guild_id = ?', [guildId]);
    }
    return settings;
  }

  isTrackingEnabled(guildId) {
    const settings = this.ensureGuildSettings(guildId);
    return settings.tracking_enabled === 1 || settings.tracking_enabled === true;
  }

  setTrackingEnabled(guildId, enabled) {
    this.ensureGuildSettings(guildId);
    this.exec(
      'UPDATE guild_settings SET tracking_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [enabled ? 1 : 0, guildId]
    );
    return enabled;
  }

  ensureMember(guildId, userId) {
    let member = this.get(
      'SELECT * FROM member_invites WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    if (!member) {
      this.exec(
        'INSERT INTO member_invites (guild_id, user_id, tracked, added, fake, left_count) VALUES (?, ?, 0, 0, 0, 0)',
        [guildId, userId]
      );
      member = this.get(
        'SELECT * FROM member_invites WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
      );
    }
    return member;
  }

  getMemberInvites(guildId, userId) {
    return this.ensureMember(guildId, userId);
  }

  getEffectiveInvites(memberData) {
    if (!memberData) return 0;
    const tracked = memberData.tracked || 0;
    const added = memberData.added || 0;
    const fake = memberData.fake || 0;
    const left = memberData.left_count || 0;
    return tracked + added - fake - left;
  }

  addInvites(guildId, userId, amount) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET added = added + ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [amount, guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  resetInvites(guildId, userId) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET added = 0, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  setInviterData(guildId, userId, inviterId, inviteCode) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET inviter_id = ?, invite_code = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [inviterId, inviteCode, guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  incrementTracked(guildId, userId, amount = 1) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET tracked = tracked + ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [amount, guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  incrementFake(guildId, userId, amount = 1) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET fake = fake + ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [amount, guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  incrementLeft(guildId, userId, amount = 1) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET left_count = left_count + ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [amount, guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  importInvites(guildId, userId, uses) {
    this.ensureMember(guildId, userId);
    this.exec(
      'UPDATE member_invites SET added = added + ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
      [uses, guildId, userId]
    );
    return this.getMemberInvites(guildId, userId);
  }

  getInviteRanks(guildId) {
    return this.all(
      'SELECT * FROM invite_ranks WHERE guild_id = ? ORDER BY invites_required ASC',
      [guildId]
    );
  }

  addInviteRank(guildId, roleId, invitesRequired) {
    const existing = this.get(
      'SELECT * FROM invite_ranks WHERE guild_id = ? AND role_id = ?',
      [guildId, roleId]
    );

    if (existing) {
      this.exec(
        'UPDATE invite_ranks SET invites_required = ? WHERE guild_id = ? AND role_id = ?',
        [invitesRequired, guildId, roleId]
      );
      return { updated: true };
    } else {
      this.exec(
        'INSERT INTO invite_ranks (guild_id, role_id, invites_required) VALUES (?, ?, ?)',
        [guildId, roleId, invitesRequired]
      );
      return { created: true };
    }
  }

  removeInviteRank(guildId, roleId) {
    const result = this.exec(
      'DELETE FROM invite_ranks WHERE guild_id = ? AND role_id = ?',
      [guildId, roleId]
    );
    return result.changes > 0;
  }

  getEligibleRanks(guildId, inviteCount) {
    return this.all(
      'SELECT * FROM invite_ranks WHERE guild_id = ? AND invites_required <= ? ORDER BY invites_required DESC',
      [guildId, inviteCount]
    );
  }

  getLeaderboard(guildId, limit = 10) {
    return this.all(
      `SELECT *, (tracked + added - fake - left_count) as effective_invites 
       FROM member_invites 
       WHERE guild_id = ? 
       ORDER BY effective_invites DESC 
       LIMIT ?`,
      [guildId, limit]
    );
  }

  resetAllInvites(guildId) {
    this.exec(
      'UPDATE member_invites SET tracked = 0, added = 0, fake = 0, left_count = 0, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [guildId]
    );
    return true;
  }
}
