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
  name: "nuke",
  description: "Delete and recreate a channel to clear all messages",
  usage: "nuke [channel]",
  aliases: [],
  category: "moderation",
  cooldown: 10,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  permissions: [PermissionFlagsBits.ManageChannels],
  enabledSlash: true,
  slashData: {
    name: "nuke",
    description: "Delete and recreate a channel to clear all messages",
    options: [{ name: "channel", description: "The channel to nuke (defaults to current)", type: 7, required: false }],
  },

  async execute({ client, message, args }) {
    const channel = message.mentions.channels.first() || message.channel;

    try {
      const position = channel.position;
      const topic = channel.topic;
      const nsfw = channel.nsfw;
      const rateLimitPerUser = channel.rateLimitPerUser;
      const parent = channel.parent;
      const permissionOverwrites = channel.permissionOverwrites.cache.map(p => ({
        id: p.id,
        allow: p.allow,
        deny: p.deny,
        type: p.type,
      }));

      const newChannel = await channel.clone({
        name: channel.name,
        topic,
        nsfw,
        rateLimitPerUser,
        parent,
        permissionOverwrites,
        position,
        reason: `Channel nuked by ${message.author.tag}`,
      });

      await channel.delete(`Nuked by ${message.author.tag}`);
      await newChannel.setPosition(position);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("nuke")} Channel Nuked`)
        .setDescription(
          `This channel has been nuked and recreated.\n\n` +
          `**Moderator:** ${message.author.tag}`
        );

      return newChannel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Nuke Failed`)
        .setDescription(`Failed to nuke the channel: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },

  async slashExecute({ client, interaction }) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;

    try {
      const position = channel.position;
      const topic = channel.topic;
      const nsfw = channel.nsfw;
      const rateLimitPerUser = channel.rateLimitPerUser;
      const parent = channel.parent;
      const permissionOverwrites = channel.permissionOverwrites.cache.map(p => ({ id: p.id, allow: p.allow, deny: p.deny, type: p.type }));

      const newChannel = await channel.clone({ name: channel.name, topic, nsfw, rateLimitPerUser, parent, permissionOverwrites, position, reason: `Channel nuked by ${interaction.user.tag}` });
      await channel.delete(`Nuked by ${interaction.user.tag}`);
      await newChannel.setPosition(position);

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Support").setURL(config.links.supportServer).setStyle(ButtonStyle.Link));
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("nuke")} Channel Nuked`).setDescription(`This channel has been nuked.\n\n**Moderator:** ${interaction.user.tag}`);
      return newChannel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder().setColor(0x000000).setTitle(`${emoji.get("cross")} Nuke Failed`).setDescription(`Failed: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
