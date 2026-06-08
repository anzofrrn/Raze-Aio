import { Database } from "#classes/Database";
import { config } from "#config/config";

export class Moderation extends Database {
  constructor() {
    super("./database/data/moderation.bread");
    this._initTables();
  }

  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mutes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        reason TEXT DEFAULT 'No reason provided',
        duration INTEGER,
        muted_at INTEGER NOT NULL,
        expires_at INTEGER,
        active INTEGER DEFAULT 1
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS warns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        reason TEXT DEFAULT 'No reason provided',
        warned_at INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reminds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        remind_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        reminded INTEGER DEFAULT 0
      )
    `);

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_mutes_guild_user ON mutes(guild_id, user_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_warns_guild_user ON warns(guild_id, user_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_reminds_user ON reminds(user_id)`);
  }

  addMute(guildId, userId, moderatorId, reason, duration = null) {
    const now = Date.now();
    const expiresAt = duration ? now + duration : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO mutes (guild_id, user_id, moderator_id, reason, duration, muted_at, expires_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    return stmt.run(guildId, userId, moderatorId, reason, duration, now, expiresAt);
  }

  removeMute(guildId, userId) {
    const stmt = this.db.prepare(`
      UPDATE mutes SET active = 0 WHERE guild_id = ? AND user_id = ? AND active = 1
    `);
    return stmt.run(guildId, userId);
  }

  getActiveMute(guildId, userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM mutes WHERE guild_id = ? AND user_id = ? AND active = 1
      ORDER BY muted_at DESC LIMIT 1
    `);
    return stmt.get(guildId, userId);
  }

  getMuteHistory(guildId, userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM mutes WHERE guild_id = ? AND user_id = ?
      ORDER BY muted_at DESC
    `);
    return stmt.all(guildId, userId);
  }

  resetMutes(guildId, userId) {
    const stmt = this.db.prepare(`DELETE FROM mutes WHERE guild_id = ? AND user_id = ?`);
    return stmt.run(guildId, userId);
  }

  addWarn(guildId, userId, moderatorId, reason) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO warns (guild_id, user_id, moderator_id, reason, warned_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(guildId, userId, moderatorId, reason, now);
  }

  getWarns(guildId, userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM warns WHERE guild_id = ? AND user_id = ?
      ORDER BY warned_at DESC
    `);
    return stmt.all(guildId, userId);
  }

  getWarnCount(guildId, userId) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM warns WHERE guild_id = ? AND user_id = ?
    `);
    return stmt.get(guildId, userId)?.count || 0;
  }

  resetWarns(guildId, userId) {
    const stmt = this.db.prepare(`DELETE FROM warns WHERE guild_id = ? AND user_id = ?`);
    return stmt.run(guildId, userId);
  }

  addRemind(guildId, channelId, userId, message, remindAt) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO reminds (guild_id, channel_id, user_id, message, remind_at, created_at, reminded)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    return stmt.run(guildId, channelId, userId, message, remindAt, now);
  }

  getReminders(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM reminds WHERE user_id = ? AND reminded = 0
      ORDER BY remind_at ASC
    `);
    return stmt.all(userId);
  }

  getPendingReminders() {
    const now = Date.now();
    const stmt = this.db.prepare(`
      SELECT * FROM reminds WHERE remind_at <= ? AND reminded = 0
    `);
    return stmt.all(now);
  }

  markReminded(id) {
    const stmt = this.db.prepare(`UPDATE reminds SET reminded = 1 WHERE id = ?`);
    return stmt.run(id);
  }

  resetReminds(userId) {
    const stmt = this.db.prepare(`DELETE FROM reminds WHERE user_id = ?`);
    return stmt.run(userId);
  }

  getExpiredMutes() {
    const now = Date.now();
    const stmt = this.db.prepare(`
      SELECT * FROM mutes WHERE expires_at IS NOT NULL AND expires_at <= ? AND active = 1
    `);
    return stmt.all(now);
  }
}
