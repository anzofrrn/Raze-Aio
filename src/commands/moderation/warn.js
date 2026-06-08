import { Command } from "#classes/Command";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import { config } from "#config/config";
import emoji from "#config/emoji";

async function sendDM(user, guildName, moderator, reason, warnCount) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("You Have Been Warned")
      .setDescription(
        `You have been warned in **${guildName}**\n\n` +
        `**Reason:** ${reason}\n` +
        `**Total Warnings:** ${warnCount}\n` +
        `**Moderator:** ${moderator.displayName || moderator.username}`
      )
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  name: "warn",
  description: "Warn a user",
  usage: "warn <user> [reason]",
  aliases: ["w"],
  category: "moderation",
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  enabledSlash: true,
  slashData: {
    name: "warn",
    description: "Warn a user",
    options: [
      { name: "user", description: "The user to warn", type: 6, required: true },
      { name: "reason", description: "Reason for the warning", type: 3, required: false },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please mention a user to warn.\n\n**Usage:** \`${this.usage}\``);

      return message.reply({ embeds: [embed] });
    }

    const target = message.mentions.members.first() || 
                   await message.guild.members.fetch(args[0]).catch(() => null);

    if (!target) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} User Not Found`)
        .setDescription("Could not find that user in this server.");

      return message.reply({ embeds: [embed] });
    }

    if (target.id === message.author.id) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Target`)
        .setDescription("You cannot warn yourself.");

      return message.reply({ embeds: [embed] });
    }

    if (target.user.bot) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Target`)
        .setDescription("You cannot warn a bot.");

      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    try {
      db.addWarn(message.guild.id, target.id, message.author.id, reason);
      const warnCount = db.getWarnCount(message.guild.id, target.id);

      const dmSent = await sendDM(target.user, message.guild.name, message.author, reason, warnCount);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("warn")} User Warned`)
        .setDescription(
          `**User:** ${target.user.tag}\n` +
          `**Reason:** ${reason}\n` +
          `**Total Warnings:** ${warnCount}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Warning Failed`)
        .setDescription(`Failed to warn the user: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!target) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} User Not Found`).setDescription("Could not find that user.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Target`).setDescription("You cannot warn yourself.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.user.bot) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Target`).setDescription("You cannot warn a bot.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      db.addWarn(interaction.guild.id, target.id, interaction.user.id, reason);
      const warnCount = db.getWarnCount(interaction.guild.id, target.id);
      const dmSent = await sendDM(target.user, interaction.guild.name, interaction.user, reason, warnCount);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("warn")} User Warned`).setDescription(`**User:** ${target.user.tag}\n**Reason:** ${reason}\n**Total Warnings:** ${warnCount}\n**DM Sent:** ${dmSent ? 'Yes' : 'No'}`);
      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Warning Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
