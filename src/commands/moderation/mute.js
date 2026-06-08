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
import ms from "ms";

async function sendDM(user, guildName, moderator, reason, duration) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("You Have Been Muted")
      .setDescription(
        `You have been muted in **${guildName}**\n\n` +
        `**Reason:** ${reason}\n` +
        `**Duration:** ${duration || 'Permanent'}\n` +
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
  name: "mute",
  description: "Mute a user in the server",
  usage: "mute <user> [duration] [reason]",
  aliases: ["m", "timeout"],
  category: "moderation",
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  permissions: [PermissionFlagsBits.ModerateMembers],
  enabledSlash: true,
  slashData: {
    name: "mute",
    description: "Mute a user in the server",
    options: [
      { name: "user", description: "The user to mute", type: 6, required: true },
      { name: "duration", description: "Duration (e.g., 1h, 1d)", type: 3, required: false },
      { name: "reason", description: "Reason for the mute", type: 3, required: false },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please mention a user to mute.\n\n**Usage:** \`${this.usage}\``);

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
        .setDescription("You cannot mute yourself.");

      return message.reply({ embeds: [embed] });
    }

    if (target.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Permission Denied`)
        .setDescription("You cannot mute someone with equal or higher role than you.");

      return message.reply({ embeds: [embed] });
    }

    if (!target.moderatable) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Cannot Mute`)
        .setDescription("I cannot mute this user. They may have higher permissions than me.");

      return message.reply({ embeds: [embed] });
    }

    let duration = null;
    let durationMs = null;
    let reason = "No reason provided";

    if (args[1]) {
      const parsedDuration = ms(args[1]);
      if (parsedDuration) {
        durationMs = parsedDuration;
        duration = args[1];
        reason = args.slice(2).join(" ") || reason;
      } else {
        reason = args.slice(1).join(" ") || reason;
      }
    }

    try {
      await target.timeout(durationMs || 28 * 24 * 60 * 60 * 1000, reason);
      
      db.addMute(message.guild.id, target.id, message.author.id, reason, durationMs);

      const dmSent = await sendDM(target.user, message.guild.name, message.author, reason, duration);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("mute")} User Muted`)
        .setDescription(
          `**User:** ${target.user.tag}\n` +
          `**Duration:** ${duration || '28 days (max)'}\n` +
          `**Reason:** ${reason}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Mute Failed`)
        .setDescription(`Failed to mute the user: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const target = interaction.options.getMember("user");
    const durationStr = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!target) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} User Not Found`).setDescription("Could not find that user.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Target`).setDescription("You cannot mute yourself.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Permission Denied`).setDescription("You cannot mute someone with equal or higher role.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!target.moderatable) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Cannot Mute`).setDescription("I cannot mute this user.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const durationMs = durationStr ? ms(durationStr) : null;

    try {
      await target.timeout(durationMs || 28 * 24 * 60 * 60 * 1000, reason);
      db.addMute(interaction.guild.id, target.id, interaction.user.id, reason, durationMs);
      const dmSent = await sendDM(target.user, interaction.guild.name, interaction.user, reason, durationStr);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("mute")} User Muted`).setDescription(`**User:** ${target.user.tag}\n**Duration:** ${durationStr || '28 days'}\n**Reason:** ${reason}\n**DM Sent:** ${dmSent ? 'Yes' : 'No'}`);
      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Mute Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
