import {
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import emoji from "#config/emoji";

export default {
  name: "add",
  description: "Add a user to the current ticket",
  usage: "add <user>",
  aliases: ["adduser", "ticketadd"],
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
        .setDescription("You don't have permission to add users to tickets.");

      return message.reply({ embeds: [embed] });
    }

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Missing User`)
        .setDescription("Please mention a user or provide their ID to add to this ticket.");

      return message.reply({ embeds: [embed] });
    }

    const user =
      message.mentions.members.first() ||
      (await message.guild.members.fetch(args[0]).catch(() => null));

    if (!user) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} User Not Found`)
        .setDescription("Could not find that user in this server.");

      return message.reply({ embeds: [embed] });
    }

    try {
      await message.channel.permissionOverwrites.create(user, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
      });

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("ticketAdd")} User Added`)
        .setDescription(
          `**User:** ${user}\n` +
          `**Added By:** ${message.author}\n` +
          `**Ticket:** #${ticketData.ticket_id}`
        );

      return message.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Failed to Add User`)
        .setDescription(`Could not add the user to this ticket: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
