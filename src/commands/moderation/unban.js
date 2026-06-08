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
      .setTitle("You Have Been Unbanned")
      .setDescription(
        `You have been unbanned from **${guildName}**\n\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${moderator.displayName || moderator.username}\n\n` +
        `You can now rejoin the server if you wish.`
      )
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  name: "unban",
  description: "Unban a user from the server",
  usage: "unban <user_id> [reason]",
  aliases: ["ub"],
  category: "moderation",
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.BanMembers],
  permissions: [PermissionFlagsBits.BanMembers],
  enabledSlash: true,
  slashData: {
    name: "unban",
    description: "Unban a user from the server",
    options: [
      { name: "user_id", description: "The user ID to unban", type: 3, required: true },
      { name: "reason", description: "Reason for the unban", type: 3, required: false },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please provide a user ID to unban.\n\n**Usage:** \`${this.usage}\``);

      return message.reply({ embeds: [embed] });
    }

    const userId = args[0].replace(/[<@!>]/g, '');
    const reason = args.slice(1).join(" ") || "No reason provided";

    try {
      const ban = await message.guild.bans.fetch(userId).catch(() => null);

      if (!ban) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("cross")} Not Banned`)
          .setDescription("This user is not banned from this server.");

        return message.reply({ embeds: [embed] });
      }

      await message.guild.members.unban(userId, reason);

      const dmSent = await sendDM(ban.user, message.guild.name, message.author, reason);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("unban")} User Unbanned`)
        .setDescription(
          `**User:** ${ban.user.tag}\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${message.author.tag}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Unban Failed`)
        .setDescription(`Failed to unban the user: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const userId = interaction.options.getString("user_id").replace(/[<@!>]/g, '');
    const reason = interaction.options.getString("reason") || "No reason provided";

    try {
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Not Banned`).setDescription("This user is not banned.");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.guild.members.unban(userId, reason);
      const dmSent = await sendDM(ban.user, interaction.guild.name, interaction.user, reason);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("unban")} User Unbanned`).setDescription(`**User:** ${ban.user.tag}\n**Reason:** ${reason}\n**DM Sent:** ${dmSent ? 'Yes' : 'No'}`);
      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Unban Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
