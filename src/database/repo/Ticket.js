import { Database } from "#structures/classes/Database";
import { config } from "#config/config";
import { logger } from "#utils/logger";

export class Ticket extends Database {
  constructor() {
    super(config.database.ticket);
    this.initTables();
  }

  initTables() {
    this.exec(`
      CREATE TABLE IF NOT EXISTS ticket_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        panel_id INTEGER NOT NULL,
        category_open TEXT,
        category_closed TEXT,
        category_claimed TEXT,
        transcript_channel TEXT,
        review_channel TEXT,
        support_roles TEXT DEFAULT '[]',
        panel_title TEXT DEFAULT 'Support Tickets',
        panel_description TEXT DEFAULT 'Click the button below to create a ticket',
        panel_color TEXT DEFAULT '#0099ff',
        use_dropdown BOOLEAN DEFAULT FALSE,
        categories TEXT DEFAULT '[]',
        auto_transcript BOOLEAN DEFAULT TRUE,
        panel_channel_id TEXT,
        panel_message_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, panel_id)
      )
    `);

    this.exec(`
      CREATE TABLE IF NOT EXISTS ticket_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        panel_id INTEGER NOT NULL,
        ticket_id INTEGER NOT NULL,
        category TEXT,
        claimed_by TEXT,
        closed_at INTEGER,
        closed_by TEXT,
        rating INTEGER,
        feedback TEXT,
        transcript_sent INTEGER DEFAULT 0,
        review_sent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const columns = this.all("PRAGMA table_info(ticket_data)");
    const columnNames = columns.map(c => c.name);
    
    if (!columnNames.includes('transcript_sent')) {
      try {
        this.exec(`ALTER TABLE ticket_data ADD COLUMN transcript_sent INTEGER DEFAULT 0`);
      } catch (e) {}
    }
    if (!columnNames.includes('review_sent')) {
      try {
        this.exec(`ALTER TABLE ticket_data ADD COLUMN review_sent INTEGER DEFAULT 0`);
      } catch (e) {}
    }

    this.exec(`
      CREATE TABLE IF NOT EXISTS ticket_counters (
        guild_id TEXT PRIMARY KEY,
        panel_counter INTEGER DEFAULT 0,
        ticket_counter INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  ensureCounter(guildId) {
    let counter = this.get("SELECT * FROM ticket_counters WHERE guild_id = ?", [guildId]);
    if (!counter) {
      this.exec("INSERT INTO ticket_counters (guild_id, panel_counter, ticket_counter) VALUES (?, 0, 0)", [guildId]);
      counter = this.get("SELECT * FROM ticket_counters WHERE guild_id = ?", [guildId]);
    }
    return counter;
  }

  incrementPanelCounter(guildId) {
    this.ensureCounter(guildId);
    
    const maxPanel = this.get(
      "SELECT MAX(panel_id) as max_id FROM ticket_panels WHERE guild_id = ?",
      [guildId]
    );
    const currentCounter = this.get(
      "SELECT panel_counter FROM ticket_counters WHERE guild_id = ?",
      [guildId]
    ).panel_counter;
    
    const nextPanelId = Math.max((maxPanel?.max_id || 0) + 1, currentCounter + 1);
    
    this.exec(
      "UPDATE ticket_counters SET panel_counter = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?",
      [nextPanelId, guildId]
    );
    
    return nextPanelId;
  }

  decrementPanelCounter(guildId) {
    this.ensureCounter(guildId);
    const counter = this.get("SELECT panel_counter FROM ticket_counters WHERE guild_id = ?", [guildId]);
    if (counter && counter.panel_counter > 0) {
      this.exec("UPDATE ticket_counters SET panel_counter = panel_counter - 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?", [guildId]);
    }
    return this.get("SELECT panel_counter FROM ticket_counters WHERE guild_id = ?", [guildId]).panel_counter;
  }

  incrementTicketCounter(guildId) {
    this.ensureCounter(guildId);
    this.exec("UPDATE ticket_counters SET ticket_counter = ticket_counter + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?", [guildId]);
    return this.get("SELECT ticket_counter FROM ticket_counters WHERE guild_id = ?", [guildId]).ticket_counter;
  }

  getCounter(guildId) {
    return this.ensureCounter(guildId);
  }

  createPanel(data) {
    const {
      guildId,
      panelId,
      categoryOpen,
      categoryClosed,
      categoryClaimed,
      transcriptChannel,
      reviewChannel,
      supportRoles = [],
      panelTitle = 'Support Tickets',
      panelDescription = 'Click the button below to create a ticket',
      panelColor = '#0099ff',
      useDropdown = false,
      categories = [],
      autoTranscript = true,
      panelChannelId,
      panelMessageId
    } = data;

    return this.exec(`
      INSERT INTO ticket_panels (
        guild_id, panel_id, category_open, category_closed, category_claimed,
        transcript_channel, review_channel, support_roles, panel_title,
        panel_description, panel_color, use_dropdown, categories,
        auto_transcript, panel_channel_id, panel_message_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      guildId,
      panelId,
      categoryOpen,
      categoryClosed,
      categoryClaimed,
      transcriptChannel,
      reviewChannel,
      JSON.stringify(supportRoles),
      panelTitle,
      panelDescription,
      panelColor,
      useDropdown ? 1 : 0,
      JSON.stringify(categories),
      autoTranscript ? 1 : 0,
      panelChannelId,
      panelMessageId
    ]);
  }

  getPanel(guildId, panelId) {
    const panel = this.get("SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_id = ?", [guildId, panelId]);
    if (panel) {
      panel.supportRoles = JSON.parse(panel.support_roles || '[]');
      panel.categories = JSON.parse(panel.categories || '[]');
      panel.autoTranscript = panel.auto_transcript === 1;
      panel.useDropdown = panel.use_dropdown === 1;
      panel.categoryOpen = panel.category_open;
      panel.categoryClosed = panel.category_closed;
      panel.categoryClaimed = panel.category_claimed;
      panel.transcriptChannel = panel.transcript_channel;
      panel.reviewChannel = panel.review_channel;
      panel.panelTitle = panel.panel_title;
      panel.panelDescription = panel.panel_description;
      panel.panelColor = panel.panel_color;
      panel.panelChannelId = panel.panel_channel_id;
      panel.panelMessageId = panel.panel_message_id;
    }
    return panel;
  }

  getAllPanels(guildId) {
    const panels = this.all("SELECT * FROM ticket_panels WHERE guild_id = ?", [guildId]);
    return panels.map(panel => {
      panel.supportRoles = JSON.parse(panel.support_roles || '[]');
      panel.categories = JSON.parse(panel.categories || '[]');
      panel.autoTranscript = panel.auto_transcript === 1;
      panel.useDropdown = panel.use_dropdown === 1;
      panel.categoryOpen = panel.category_open;
      panel.categoryClosed = panel.category_closed;
      panel.categoryClaimed = panel.category_claimed;
      panel.transcriptChannel = panel.transcript_channel;
      panel.reviewChannel = panel.review_channel;
      panel.panelTitle = panel.panel_title;
      panel.panelDescription = panel.panel_description;
      panel.panelColor = panel.panel_color;
      panel.panelChannelId = panel.panel_channel_id;
      panel.panelMessageId = panel.panel_message_id;
      return panel;
    });
  }

  updatePanel(guildId, panelId, updates) {
    const allowedKeys = [
      'category_open', 'category_closed', 'category_claimed',
      'transcript_channel', 'review_channel', 'support_roles',
      'panel_title', 'panel_description', 'panel_color',
      'use_dropdown', 'categories', 'auto_transcript',
      'panel_channel_id', 'panel_message_id'
    ];

    const keys = Object.keys(updates).filter(key => allowedKeys.includes(key));
    if (keys.length === 0) return null;

    const setClause = keys.map(key => `${key} = ?`).join(", ");
    const values = keys.map(key => {
      const value = updates[key];
      if (Array.isArray(value)) return JSON.stringify(value);
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    });
    values.push(guildId, panelId);

    return this.exec(
      `UPDATE ticket_panels SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND panel_id = ?`,
      values
    );
  }

  deletePanel(guildId, panelId) {
    return this.exec("DELETE FROM ticket_panels WHERE guild_id = ? AND panel_id = ?", [guildId, panelId]);
  }

  createTicket(data) {
    const { guildId, channelId, userId, panelId, ticketId, category } = data;
    return this.exec(`
      INSERT INTO ticket_data (guild_id, channel_id, user_id, panel_id, ticket_id, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [guildId, channelId, userId, panelId, ticketId, category]);
  }

  getTicket(channelId) {
    return this.get("SELECT * FROM ticket_data WHERE channel_id = ?", [channelId]);
  }

  getTicketById(guildId, ticketId) {
    return this.get("SELECT * FROM ticket_data WHERE guild_id = ? AND ticket_id = ?", [guildId, ticketId]);
  }

  getUserTickets(guildId, userId) {
    return this.all("SELECT * FROM ticket_data WHERE guild_id = ? AND user_id = ? AND closed_at IS NULL", [guildId, userId]);
  }

  getAllOpenTickets(guildId) {
    return this.all("SELECT * FROM ticket_data WHERE guild_id = ? AND closed_at IS NULL", [guildId]);
  }

  claimTicket(channelId, claimedBy) {
    return this.exec("UPDATE ticket_data SET claimed_by = ? WHERE channel_id = ?", [claimedBy, channelId]);
  }

  closeTicket(channelId, closedBy) {
    return this.exec("UPDATE ticket_data SET closed_at = ?, closed_by = ? WHERE channel_id = ?", [Date.now(), closedBy, channelId]);
  }

  rateTicket(channelId, rating, feedback = null) {
    return this.exec("UPDATE ticket_data SET rating = ?, feedback = ? WHERE channel_id = ?", [rating, feedback, channelId]);
  }

  markTranscriptSent(channelId) {
    return this.exec("UPDATE ticket_data SET transcript_sent = 1 WHERE channel_id = ?", [channelId]);
  }

  markReviewSent(channelId) {
    return this.exec("UPDATE ticket_data SET review_sent = 1 WHERE channel_id = ?", [channelId]);
  }

  isTranscriptSent(channelId) {
    const ticket = this.get("SELECT transcript_sent FROM ticket_data WHERE channel_id = ?", [channelId]);
    return ticket?.transcript_sent === 1;
  }

  isReviewSent(channelId) {
    const ticket = this.get("SELECT review_sent FROM ticket_data WHERE channel_id = ?", [channelId]);
    return ticket?.review_sent === 1;
  }

  getTicketStats(guildId) {
    const total = this.get("SELECT COUNT(*) as count FROM ticket_data WHERE guild_id = ?", [guildId]);
    const open = this.get("SELECT COUNT(*) as count FROM ticket_data WHERE guild_id = ? AND closed_at IS NULL", [guildId]);
    const closed = this.get("SELECT COUNT(*) as count FROM ticket_data WHERE guild_id = ? AND closed_at IS NOT NULL", [guildId]);
    const avgRating = this.get("SELECT AVG(rating) as avg FROM ticket_data WHERE guild_id = ? AND rating IS NOT NULL", [guildId]);
    
    return {
      total: total?.count || 0,
      open: open?.count || 0,
      closed: closed?.count || 0,
      avgRating: avgRating?.avg ? parseFloat(avgRating.avg).toFixed(1) : 'N/A'
    };
  }

  deleteTicket(channelId) {
    return this.exec("DELETE FROM ticket_data WHERE channel_id = ?", [channelId]);
  }
}
