import { logger } from "#utils/logger";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { config } from "#config/config";
import { db } from "#database/DatabaseManager";
import emoji from "#config/emoji";

function createNavigationButtons() {
  const systemButton = new ButtonBuilder()
    .setCustomId("mention_system")
    .setLabel("System")
    .setStyle(ButtonStyle.Secondary);

  const devsButton = new ButtonBuilder()
    .setCustomId("mention_devs")
    .setLabel("About Devs")
    .setStyle(ButtonStyle.Secondary);

  const linksButton = new ButtonBuilder()
    .setCustomId("mention_links")
    .setLabel("Links")
    .setStyle(ButtonStyle.Secondary);

  const homeButton = new ButtonBuilder()
    .setCustomId("mention_home")
    .setEmoji("🏠")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder().addComponents(
    systemButton,
    devsButton,
    linksButton,
    homeButton
  );
}

function getUptime(client) {
  const uptime = client.uptime;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  
  let uptimeStr = "";
  if (days > 0) uptimeStr += `${days}d `;
  if (hours > 0) uptimeStr += `${hours}h `;
  if (minutes > 0) uptimeStr += `${minutes}m `;
  uptimeStr += `${seconds}s`;
  
  return uptimeStr.trim();
}

async function buildHomePage(interaction, client) {
  const guildPrefixes = db.getPrefixes(interaction.guild.id);
  const currentPrefix = guildPrefixes[0] || "!";
  const guildIconUrl = interaction.guild.iconURL({ dynamic: true, size: 256 });
  
  const homeContent = `> *Hey <@${interaction.user.id}>, I'm* __**Raze**__ ${emoji.get("status")}\n` +
    `> *A **multipurpose** bot made to manage your server safely and smoothly with **moderation, music, ticket and more...** ${emoji.get("info")}*\n\n` +
    `*Type \`${currentPrefix}help\` to know more about my commands and more...*\n\n` +
    `**Server Prefix:** \`${currentPrefix}\``;

  const container = new ContainerBuilder();
  
  if (guildIconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(homeContent)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(guildIconUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(homeContent)
    );
  }

  return {
    components: [container, createNavigationButtons()],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function buildSystemPage(interaction, client) {
  const guildIconUrl = interaction.guild.iconURL({ dynamic: true, size: 256 });
  const nodeInfo = client.music?.nodeManager?.nodes?.first();
  let lavalinkStatus = "Disconnected";
  let lavalinkUptime = "N/A";
  
  if (nodeInfo && nodeInfo.connected) {
    lavalinkStatus = "Connected";
    if (nodeInfo.stats?.uptime) {
      const lvUptime = nodeInfo.stats.uptime;
      const lvDays = Math.floor(lvUptime / 86400000);
      const lvHours = Math.floor((lvUptime % 86400000) / 3600000);
      const lvMinutes = Math.floor((lvUptime % 3600000) / 60000);
      lavalinkUptime = `${lvDays}d ${lvHours}h ${lvMinutes}m`;
    }
  }

  const systemContent = 
    `**${emoji.get("info")} System Information**\n\n` +
    `\`01.\` **Bot Version:** \`v${config.version || "2.0.0"}\`\n` +
    `\`02.\` **Node.js:** \`${process.version}\`\n` +
    `\`03.\` **Discord.js:** \`v14\`\n` +
    `\`04.\` **Bot Uptime:** \`${getUptime(client)}\`\n` +
    `\`05.\` **Memory Usage:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`\n` +
    `\`06.\` **Servers:** \`${client.guilds.cache.size}\`\n` +
    `\`07.\` **Users:** \`${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}\`\n\n` +
    `**${emoji.get("music")} Lavalink Status**\n\n` +
    `\`01.\` **Status:** \`${lavalinkStatus}\`\n` +
    `\`02.\` **Uptime:** \`${lavalinkUptime}\`\n` +
    `\`03.\` **Players:** \`${nodeInfo?.stats?.players || 0}\``;

  const container = new ContainerBuilder();
  
  if (guildIconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(systemContent)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(guildIconUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(systemContent)
    );
  }

  return {
    components: [container, createNavigationButtons()],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function buildDevsPage(interaction, client) {
  const guildIconUrl = interaction.guild.iconURL({ dynamic: true, size: 256 });
  const ownerId = config.ownerIds?.[0] || "1401807828963823636";
  let ownerName = "Developer";
  let ownerAvatarUrl = config.assets?.defaultThumbnail;
  
  try {
    const owner = await client.users.fetch(ownerId);
    ownerName = owner.displayName || owner.globalName || owner.username;
    ownerAvatarUrl = owner.displayAvatarURL({ dynamic: true, size: 256 });
  } catch {}

  const devsContent = 
    `**${emoji.get("info")} About Developers**\n\n` +
    `\`01.\` _**Developed And Designed By [${ownerName}](https://discord.com/users/${ownerId})**_ ${emoji.get("check")}`;

  const container = new ContainerBuilder();
  
  if (guildIconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(devsContent)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(guildIconUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(devsContent)
    );
  }
  
  container
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("*The creator behind Raze*")
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(ownerAvatarUrl)
        )
    );

  return {
    components: [container, createNavigationButtons()],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function buildLinksPage(interaction, client) {
  const guildIconUrl = interaction.guild.iconURL({ dynamic: true, size: 256 });
  const supportServerUrl = config.links?.supportServer || "https://discord.gg/raze";
  
  let serverIconUrl = config.assets?.defaultThumbnail;
  try {
    const invite = await client.fetchInvite("errorx");
    if (invite.guild?.iconURL()) {
      serverIconUrl = invite.guild.iconURL({ dynamic: true, size: 256 });
    }
  } catch {}

  const linksContent = 
    `**${emoji.get("info")} Important Links**\n\n` +
    `_**Support Server Link -> ${supportServerUrl}**_`;

  const container = new ContainerBuilder();
  
  if (guildIconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(linksContent)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(guildIconUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(linksContent)
    );
  }
  
  container
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("*Join for support and updates*")
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(serverIconUrl)
        )
    );

  return {
    components: [container, createNavigationButtons()],
    flags: MessageFlags.IsComponentsV2,
  };
}

export default {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    if (!customId.startsWith("mention_")) return;

    try {
      let response;
      
      switch (customId) {
        case "mention_home":
          response = await buildHomePage(interaction, client);
          break;
        case "mention_system":
          response = await buildSystemPage(interaction, client);
          break;
        case "mention_devs":
          response = await buildDevsPage(interaction, client);
          break;
        case "mention_links":
          response = await buildLinksPage(interaction, client);
          break;
        default:
          return;
      }

      await interaction.update(response);
    } catch (error) {
      logger.error("MentionButtons", "Mention button error:", error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "An error occurred while processing your request.",
            ephemeral: true,
          });
        }
      } catch {}
    }
  },
};
