import {
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import emoji from "#config/emoji";

export default {
  name: "rename",
  description: "Rename the current ticket",
  usage: "rename <name>",
  aliases: ["renameticket", "ticketrename"],
  category: "Ticket",
  cooldown: 3,

  async execute({ client, message, args }) {
    const ticketData = db.getTicket(message.channel.id);

    if (!ticketData) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Not a Ticket`)
        .setDescription("This command can only be used in a ticket channel.");

      return message.reply({ embeds: [embed] });
    }

    const panel = db.getTicketPanel(message.guild.id, ticketData.panel_id);

    if (!panel) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Panel Not Found`)
        .setDescription("The ticket panel configuration was not found.");

      return message.reply({ embeds: [embed] });
    }

    const hasPermission =
      message.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      panel.supportRoles.some((roleId) =>
        message.member.roles.cache.has(roleId)
      );

    if (!hasPermission) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} No Permission`)
        .setDescription("You don't have permission to rename tickets.");

      return message.reply({ embeds: [embed] });
    }

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Missing Name`)
        .setDescription("Please provide a new name for this ticket.");

      return message.reply({ embeds: [embed] });
    }

    const newName = args.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "");
    const oldName = message.channel.name;

    if (!newName) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Name`)
        .setDescription("The provided name is invalid. Use only letters, numbers, and hyphens.");

      return message.reply({ embeds: [embed] });
    }

    try {
      await message.channel.setName(newName);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("ticketRename")} Ticket Renamed`)
        .setDescription(
          `**Old Name:** ${oldName}\n` +
          `**New Name:** ${newName}\n` +
          `**Renamed By:** ${message.author}`
        );

      return message.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Failed to Rename`)
        .setDescription(`Could not rename the ticket: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
