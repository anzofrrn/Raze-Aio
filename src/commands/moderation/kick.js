import { Command } from "#classes/Command";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";

async function sendDM(user, guildName, moderator, reason) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("You Have Been Kicked")
      .setDescription(
        `You have been kicked from **${guildName}**\n\n` +
        `**Reason:** ${reason}\n` +
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
  name: "kick",
  description: "Kick a user from the server",
  usage: "kick <user> [reason]",
  aliases: ["k"],
  category: "moderation",
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.KickMembers],
  permissions: [PermissionFlagsBits.KickMembers],
  enabledSlash: true,
  slashData: {
    name: "kick",
    description: "Kick a user from the server",
    options: [
      { name: "user", description: "The user to kick", type: 6, required: true },
      { name: "reason", description: "Reason for the kick", type: 3, required: false },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please mention a user to kick.\n\n**Usage:** \`${this.usage}\``);

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
        .setDescription("You cannot kick yourself.");

      return message.reply({ embeds: [embed] });
    }

    if (target.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Permission Denied`)
        .setDescription("You cannot kick someone with equal or higher role than you.");

      return message.reply({ embeds: [embed] });
    }

    if (!target.kickable) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Cannot Kick`)
        .setDescription("I cannot kick this user. They may have higher permissions than me.");

      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    try {
      const dmSent = await sendDM(target.user, message.guild.name, message.author, reason);
      
      await target.kick(reason);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("kick")} User Kicked`)
        .setDescription(
          `**User:** ${target.user.tag}\n` +
          `**Reason:** ${reason}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Kick Failed`)
        .setDescription(`Failed to kick the user: ${error.message}`);

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
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Target`).setDescription("You cannot kick yourself.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Permission Denied`).setDescription("You cannot kick someone with equal or higher role.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!target.kickable) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Cannot Kick`).setDescription("I cannot kick this user.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const dmSent = await sendDM(target.user, interaction.guild.name, interaction.user, reason);
      await target.kick(reason);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("kick")} User Kicked`).setDescription(`**User:** ${target.user.tag}\n**Reason:** ${reason}\n**DM Sent:** ${dmSent ? 'Yes' : 'No'}`);
      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Kick Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
