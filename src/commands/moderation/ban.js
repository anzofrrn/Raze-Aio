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
      .setTitle("You Have Been Banned")
      .setDescription(
        `You have been banned from **${guildName}**\n\n` +
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
  name: "ban",
  description: "Ban a user from the server",
  usage: "ban <user> [reason]",
  aliases: ["b"],
  category: "moderation",
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.BanMembers],
  permissions: [PermissionFlagsBits.BanMembers],
  enabledSlash: true,
  slashData: {
    name: "ban",
    description: "Ban a user from the server",
    options: [
      {
        name: "user",
        description: "The user to ban",
        type: 6,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the ban",
        type: 3,
        required: false,
      },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please mention a user to ban.\n\n**Usage:** \`${this.usage}\``);

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
        .setDescription("You cannot ban yourself.");

      return message.reply({ embeds: [embed] });
    }

    if (target.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Permission Denied`)
        .setDescription("You cannot ban someone with equal or higher role than you.");

      return message.reply({ embeds: [embed] });
    }

    if (!target.bannable) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Cannot Ban`)
        .setDescription("I cannot ban this user. They may have higher permissions than me.");

      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    try {
      const dmSent = await sendDM(target.user, message.guild.name, message.author, reason);
      
      await target.ban({ reason, deleteMessageSeconds: 604800 });

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("ban")} User Banned`)
        .setDescription(
          `**User:** ${target.user.tag}\n` +
          `**Reason:** ${reason}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Ban Failed`)
        .setDescription(`Failed to ban the user: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!target) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} User Not Found`)
        .setDescription("Could not find that user in this server.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Target`)
        .setDescription("You cannot ban yourself.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Permission Denied`)
        .setDescription("You cannot ban someone with equal or higher role than you.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!target.bannable) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Cannot Ban`)
        .setDescription("I cannot ban this user. They may have higher permissions than me.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const dmSent = await sendDM(target.user, interaction.guild.name, interaction.user, reason);
      await target.ban({ reason, deleteMessageSeconds: 604800 });

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("ban")} User Banned`)
        .setDescription(
          `**User:** ${target.user.tag}\n` +
          `**Reason:** ${reason}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Ban Failed`)
        .setDescription(`Failed to ban the user: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
