import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";
import { config } from "#config/config";

class ServerListCommand extends Command {
  constructor() {
    super({
      name: "serverlist",
      description: "List all servers the bot is in",
      usage: "serverlist [page]",
      aliases: ["servers", "guildlist", "guilds"],
      category: "Owner",
      examples: ["serverlist", "serverlist 2"],
      cooldown: 0,
      ownerOnly: true,
    });
  }

  async execute({ client, message, args }) {
    try {
      if (!config.ownerIds?.includes(message.author.id)) {
        return message.reply({
          content: `${emoji.get("cross")} This command is only available to bot owners.`,
        });
      }

      const guilds = [...client.guilds.cache.values()].sort(
        (a, b) => b.memberCount - a.memberCount
      );

      const perPage = 10;
      const maxPages = Math.ceil(guilds.length / perPage);
      let currentPage = parseInt(args[0]) || 1;

      if (currentPage < 1) currentPage = 1;
      if (currentPage > maxPages) currentPage = maxPages;

      const startIndex = (currentPage - 1) * perPage;
      const endIndex = startIndex + perPage;
      const pageGuilds = guilds.slice(startIndex, endIndex);

      const totalMembers = guilds.reduce((acc, g) => acc + g.memberCount, 0);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("server")} **Server List** (${guilds.length} total)`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Total Servers:** ${guilds.length}\n` +
          `**Total Members:** ${totalMembers.toLocaleString()}`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      let serverList = "";
      pageGuilds.forEach((guild, index) => {
        const globalIndex = startIndex + index + 1;
        serverList += `**${globalIndex}.** ${guild.name}\n`;
        serverList += `└─ ID: \`${guild.id}\` | Members: ${guild.memberCount}\n`;
      });

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(serverList || "No servers found.")
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Page ${currentPage}/${maxPages}`
        )
      );

      if (maxPages > 1) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`serverlist_${currentPage - 1}`)
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1),
          new ButtonBuilder()
            .setCustomId(`serverlist_${currentPage + 1}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === maxPages)
        );
        container.addActionRowComponents(row);
      }

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("ServerListCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new ServerListCommand();
