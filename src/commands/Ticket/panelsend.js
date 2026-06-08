import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import emoji from "#config/emoji";

export default {
  name: "panelsend",
  description: "Send an existing ticket panel to a channel",
  usage: "panelsend <panel_id> [channel]",
  aliases: ["sendpanel", "resendpanel"],
  category: "Ticket",
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute({ client, message, args, prefix }) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} No Permission`)
        .setDescription("You need the **Manage Server** permission to use this command.");

      return message.reply({ embeds: [embed] });
    }

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Missing Panel ID`)
        .setDescription(
          `**Usage:** \`${prefix}panelsend <panel_id> [channel]\`\n\n` +
          `**Examples:**\n` +
          `├─ \`${prefix}panelsend 1\` - Send panel #1 to current channel\n` +
          `├─ \`${prefix}panelsend 1 #tickets\` - Send panel #1 to #tickets\n` +
          `└─ \`${prefix}panelsend 2 1234567890\` - Send panel #2 to channel ID`
        );

      return message.reply({ embeds: [embed] });
    }

    const panelId = parseInt(args[0]);
    if (isNaN(panelId)) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Panel ID`)
        .setDescription("Please provide a valid panel number.");

      return message.reply({ embeds: [embed] });
    }

    const panel = db.getTicketPanel(message.guild.id, panelId);

    if (!panel) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Panel Not Found`)
        .setDescription(`Panel #${panelId} was not found in this server.`);

      return message.reply({ embeds: [embed] });
    }

    let targetChannel = message.channel;
    if (args[1]) {
      const channelId = message.mentions.channels.first()?.id || args[1];
      targetChannel = message.guild.channels.cache.get(channelId);

      if (!targetChannel || !targetChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("cross")} Invalid Channel`)
          .setDescription("Please mention a valid text channel or provide a valid channel ID.");

        return message.reply({ embeds: [embed] });
      }
    }

    if (panel.categories.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Empty Panel`)
        .setDescription(`Panel #${panelId} has no categories configured. Cannot send an empty panel.`);

      return message.reply({ embeds: [embed] });
    }

    try {
      const panelEmbed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("ticketPanel")} ${panel.panelTitle}`)
        .setDescription(panel.panelDescription);

      let components = [];

      if (panel.useDropdown) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`ticket_create_${panelId}`)
          .setPlaceholder("Select a ticket category")
          .addOptions(
            panel.categories.map((cat, index) => ({
              label: cat.name,
              description: cat.description || `Create a ${cat.name} ticket`,
              value: `${panelId}_${index}`,
              emoji: cat.emoji || emoji.get("ticket"),
            }))
          );

        components.push(new ActionRowBuilder().addComponents(selectMenu));
      } else {
        const buttons = panel.categories.map((cat, index) =>
          new ButtonBuilder()
            .setCustomId(`ticket_create_${panelId}_${index}`)
            .setLabel(cat.name)
            .setEmoji(cat.emoji || emoji.get("ticket"))
            .setStyle(ButtonStyle.Primary)
        );

        for (let i = 0; i < buttons.length; i += 5) {
          components.push(
            new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
          );
        }
      }

      const panelMessage = await targetChannel.send({
        embeds: [panelEmbed],
        components: components,
      });

      db.updateTicketPanel(message.guild.id, panelId, {
        panel_channel_id: targetChannel.id,
        panel_message_id: panelMessage.id,
      });

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("check")} Panel Sent Successfully`)
        .setDescription(
          `**Panel ID:** ${panelId}\n` +
          `**Channel:** ${targetChannel}\n` +
          `**Categories:** ${panel.categories.length}\n` +
          `**Type:** ${panel.useDropdown ? "Dropdown Menu" : "Buttons"}`
        );

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Panel send error:", error);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Failed to Send Panel`)
        .setDescription(`An error occurred while sending the panel: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
