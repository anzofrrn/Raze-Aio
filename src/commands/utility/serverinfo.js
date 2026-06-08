import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MessageFlags,
  ChannelType,
} from "discord.js";
import emoji from "#config/emoji";

class ServerInfoCommand extends Command {
  constructor() {
    super({
      name: "serverinfo",
      description: "Display detailed information about the server",
      usage: "serverinfo",
      aliases: ["si", "guildinfo", "server"],
      category: "utility",
      examples: ["serverinfo"],
      cooldown: 5,
      enabledSlash: true,
      slashData: {
        name: "serverinfo",
        description: "Display detailed information about the server",
      },
    });
  }

  async execute({ client, message, args }) {
    try {
      const { guild } = message;

      await guild.members.fetch();

      const owner = await guild.fetchOwner();
      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
      const roles = guild.roles.cache.size;
      const emojis = guild.emojis.cache.size;
      const stickers = guild.stickers.cache.size;
      const boosts = guild.premiumSubscriptionCount || 0;
      const boostLevel = guild.premiumTier;
      const members = guild.memberCount;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      const humans = members - bots;
      const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
      const idle = guild.members.cache.filter(m => m.presence?.status === "idle").size;
      const dnd = guild.members.cache.filter(m => m.presence?.status === "dnd").size;

      const verificationLevels = {
        0: "None",
        1: "Low",
        2: "Medium",
        3: "High",
        4: "Very High"
      };

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("server")} **Server Information**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const generalInfo = 
        `**General Information:**\n` +
        `├─ **Name:** ${guild.name}\n` +
        `├─ **ID:** \`${guild.id}\`\n` +
        `├─ **Owner:** ${owner.user.tag}\n` +
        `├─ **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n` +
        `└─ **Verification:** ${verificationLevels[guild.verificationLevel]}`;

      const section1 = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(generalInfo)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            guild.iconURL({ dynamic: true, size: 1024 }) || "https://cdn.discordapp.com/embed/avatars/0.png"
          )
        );

      container.addSectionComponents(section1);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const memberInfo = 
        `**Members [${members}]:**\n` +
        `├─ **Humans:** ${humans}\n` +
        `├─ **Bots:** ${bots}\n` +
        `├─ **Online:** ${online}\n` +
        `├─ **Idle:** ${idle}\n` +
        `└─ **DND:** ${dnd}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(memberInfo)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const channelInfo = 
        `**Channels [${guild.channels.cache.size}]:**\n` +
        `├─ **Text:** ${textChannels}\n` +
        `├─ **Voice:** ${voiceChannels}\n` +
        `└─ **Categories:** ${categories}`;

      const extraInfo = 
        `**Extra:**\n` +
        `├─ **Roles:** ${roles}\n` +
        `├─ **Emojis:** ${emojis}\n` +
        `├─ **Stickers:** ${stickers}\n` +
        `├─ **Boosts:** ${boosts}\n` +
        `└─ **Boost Level:** ${boostLevel}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${channelInfo}\n\n${extraInfo}`)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("ServerInfoCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while fetching server info.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const { guild } = interaction;
      await guild.members.fetch();

      const owner = await guild.fetchOwner();
      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
      const roles = guild.roles.cache.size;
      const emojis = guild.emojis.cache.size;
      const stickers = guild.stickers.cache.size;
      const boosts = guild.premiumSubscriptionCount || 0;
      const boostLevel = guild.premiumTier;
      const members = guild.memberCount;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      const humans = members - bots;

      const verificationLevels = { 0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Very High" };

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("server")} **Server Information**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      const generalInfo = `**General Information:**\n├─ **Name:** ${guild.name}\n├─ **ID:** \`${guild.id}\`\n├─ **Owner:** ${owner.user.tag}\n├─ **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n└─ **Verification:** ${verificationLevels[guild.verificationLevel]}`;
      const section1 = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(generalInfo)).setThumbnailAccessory(new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true, size: 1024 }) || "https://cdn.discordapp.com/embed/avatars/0.png"));
      container.addSectionComponents(section1);

      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Members [${members}]:**\n├─ **Humans:** ${humans}\n├─ **Bots:** ${bots}`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      const channelInfo = `**Channels [${guild.channels.cache.size}]:**\n├─ **Text:** ${textChannels}\n├─ **Voice:** ${voiceChannels}\n└─ **Categories:** ${categories}`;
      const extraInfo = `**Extra:**\n├─ **Roles:** ${roles}\n├─ **Emojis:** ${emojis}\n├─ **Stickers:** ${stickers}\n├─ **Boosts:** ${boosts}\n└─ **Boost Level:** ${boostLevel}`;
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${channelInfo}\n\n${extraInfo}`));

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred while fetching server info.`, ephemeral: true });
    }
  }
}

export default new ServerInfoCommand();
