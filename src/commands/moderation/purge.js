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

export default {
  name: "purge",
  description: "Delete multiple messages at once",
  usage: "purge <amount> [user]",
  aliases: ["clear", "prune"],
  category: "moderation",
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  permissions: [PermissionFlagsBits.ManageMessages],
  enabledSlash: true,
  slashData: {
    name: "purge",
    description: "Delete multiple messages at once",
    options: [
      { name: "amount", description: "Number of messages to delete (1-100)", type: 4, required: true },
      { name: "user", description: "Only delete messages from this user", type: 6, required: false },
    ],
  },

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please provide the number of messages to delete.\n\n**Usage:** \`${this.usage}\``);

      return message.reply({ embeds: [embed] });
    }

    const amount = parseInt(args[0]);

    if (isNaN(amount) || amount < 1 || amount > 100) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Amount`)
        .setDescription("Please provide a number between 1 and 100.");

      return message.reply({ embeds: [embed] });
    }

    const target = message.mentions.users.first();

    try {
      await message.delete().catch(() => {});

      let messages = await message.channel.messages.fetch({ limit: 100 });
      
      if (target) {
        messages = messages.filter(m => m.author.id === target.id);
      }

      messages = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      
      const toDelete = [...messages.values()].slice(0, amount);
      const deleted = await message.channel.bulkDelete(toDelete, true);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("purge")} Messages Purged`)
        .setDescription(
          `**Deleted:** ${deleted.size} messages\n` +
          (target ? `**From User:** ${target.tag}\n` : '') +
          `**Moderator:** ${message.author.tag}`
        );

      const reply = await message.channel.send({ embeds: [embed], components: [row] });

      setTimeout(() => reply.delete().catch(() => {}), 5000);
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Purge Failed`)
        .setDescription(`Failed to purge messages: ${error.message}`);

      return message.channel.send({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const amount = interaction.options.getInteger("amount");
    const target = interaction.options.getUser("user");

    if (amount < 1 || amount > 100) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Invalid Amount`).setDescription("Please provide a number between 1 and 100.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      let messages = await interaction.channel.messages.fetch({ limit: 100 });
      if (target) messages = messages.filter(m => m.author.id === target.id);
      messages = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      const toDelete = [...messages.values()].slice(0, amount);
      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("purge")} Messages Purged`).setDescription(`**Deleted:** ${deleted.size} messages${target ? `\n**From User:** ${target.tag}` : ''}`);
      const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Purge Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
