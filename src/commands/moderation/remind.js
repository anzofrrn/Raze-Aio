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

async function sendDM(user, guildName, moderator, message) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("You Have Been Reminded")
      .setDescription(
        `You have been reminded in **${guildName}**\n\n` +
        `**Message:** ${message}\n` +
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
  name: "remind",
  description: "Remind a user",
  usage: "remind <user> [message]",
  aliases: ["reminder", "remindme"],
  category: "moderation",
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  enabledSlash: true,
  slashData: {
    name: "remind",
    description: "Remind a user",
    options: [
      { name: "user", description: "The user to remind", type: 6, required: true },
      { name: "message", description: "Reminder message", type: 3, required: false },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please mention a user to remind.\n\n**Usage:** \`${this.usage}\``);

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
        .setDescription("You cannot remind yourself.");

      return message.reply({ embeds: [embed] });
    }

    if (target.user.bot) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Target`)
        .setDescription("You cannot remind a bot.");

      return message.reply({ embeds: [embed] });
    }

    const reminderMessage = args.slice(1).join(" ") || "No message provided";

    try {
      const dmSent = await sendDM(target.user, message.guild.name, message.author, reminderMessage);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("remind")} User Reminded`)
        .setDescription(
          `**User:** ${target.user.tag}\n` +
          `**Message:** ${reminderMessage}\n` +
          `**DM Sent:** ${dmSent ? 'Yes' : 'No'}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Reminder Failed`)
        .setDescription(`Failed to send the reminder: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const target = interaction.options.getMember("user");
    const reminderMessage = interaction.options.getString("message") || "No message provided";

    if (!target) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} User Not Found`).setDescription("Could not find that user.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Target`).setDescription("You cannot remind yourself.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.user.bot) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Target`).setDescription("You cannot remind a bot.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const dmSent = await sendDM(target.user, interaction.guild.name, interaction.user, reminderMessage);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("remind")} User Reminded`).setDescription(`**User:** ${target.user.tag}\n**Message:** ${reminderMessage}\n**DM Sent:** ${dmSent ? 'Yes' : 'No'}`);
      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Reminder Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
