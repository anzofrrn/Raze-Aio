import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";
import { config } from "#config/config";

class ShardCommand extends Command {
  constructor() {
    super({
      name: "shard",
      description: "View servers running on a specific shard",
      usage: "shard <shard_number>",
      aliases: ["shardinfo", "shardstatus"],
      category: "Owner",
      examples: ["shard 0", "shard 1", "shard 2", "shard 3"],
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

      if (!args[0]) {
        return this._showShardOverview(client, message);
      }

      const shardId = parseInt(args[0]);
      
      if (isNaN(shardId) || shardId < 0 || shardId > 3) {
        return message.reply({
          content: `${emoji.get("cross")} Invalid shard number. Please use a number between 0 and 3.`,
        });
      }

      return this._showShardServers(client, message, shardId, args);
    } catch (error) {
      client.logger?.error("ShardCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while fetching shard information.`,
      });
    }
  }

  async _showShardOverview(client, message) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("info")} **Shard Overview**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    let shardInfo = "";
    
    if (client.cluster) {
      try {
        const results = await client.cluster.broadcastEval((c) => {
          return {
            clusterId: c.cluster?.id ?? 0,
            shardIds: c.cluster?.ids?.shards ?? [0],
            guilds: c.guilds.cache.size,
            members: c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
            ping: c.ws.ping,
          };
        });

        let totalGuilds = 0;
        let totalMembers = 0;

        results.forEach((cluster) => {
          const shards = cluster.shardIds.join(", ");
          shardInfo += `**Cluster ${cluster.clusterId}** (Shards: ${shards})\n`;
          shardInfo += `├─ Servers: ${cluster.guilds}\n`;
          shardInfo += `├─ Members: ${cluster.members.toLocaleString()}\n`;
          shardInfo += `└─ Ping: ${cluster.ping}ms\n\n`;
          totalGuilds += cluster.guilds;
          totalMembers += cluster.members;
        });

        shardInfo += `**Total:** ${totalGuilds} servers | ${totalMembers.toLocaleString()} members`;
      } catch (e) {
        shardInfo = `**Current Shard**\n`;
        shardInfo += `├─ Servers: ${client.guilds.cache.size}\n`;
        shardInfo += `├─ Members: ${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0).toLocaleString()}\n`;
        shardInfo += `└─ Ping: ${client.ws.ping}ms`;
      }
    } else {
      shardInfo = `**Single Instance (No Sharding)**\n`;
      shardInfo += `├─ Servers: ${client.guilds.cache.size}\n`;
      shardInfo += `├─ Members: ${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0).toLocaleString()}\n`;
      shardInfo += `└─ Ping: ${client.ws.ping}ms`;
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(shardInfo)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Usage:** \`shard <0-3>\` to view servers on a specific shard`
      )
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  async _showShardServers(client, message, shardId, args) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("server")} **Shard ${shardId} Servers**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    let guilds = [];
    let shardPing = 0;

    if (client.cluster) {
      try {
        const results = await client.cluster.broadcastEval(
          (c, context) => {
            const shardGuilds = [...c.guilds.cache.values()]
              .filter((g) => g.shardId === context.shardId)
              .map((g) => ({
                id: g.id,
                name: g.name,
                memberCount: g.memberCount,
                shardId: g.shardId,
              }))
              .sort((a, b) => b.memberCount - a.memberCount);
            
            const shard = c.ws.shards.get(context.shardId);
            return {
              guilds: shardGuilds,
              ping: shard?.ping ?? c.ws.ping,
            };
          },
          { context: { shardId } }
        );

        results.forEach((result) => {
          if (result.guilds.length > 0) {
            guilds.push(...result.guilds);
            shardPing = result.ping;
          }
        });
      } catch (e) {
        guilds = [...client.guilds.cache.values()]
          .filter((g) => g.shardId === shardId)
          .map((g) => ({
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            shardId: g.shardId,
          }))
          .sort((a, b) => b.memberCount - a.memberCount);
        shardPing = client.ws.ping;
      }
    } else {
      guilds = [...client.guilds.cache.values()]
        .filter((g) => (g.shardId ?? 0) === shardId)
        .map((g) => ({
          id: g.id,
          name: g.name,
          memberCount: g.memberCount,
          shardId: g.shardId ?? 0,
        }))
        .sort((a, b) => b.memberCount - a.memberCount);
      shardPing = client.ws.ping;
    }

    if (guilds.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `No servers found on Shard ${shardId}.`
        )
      );
    } else {
      const totalMembers = guilds.reduce((acc, g) => acc + g.memberCount, 0);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Total Servers:** ${guilds.length}\n` +
          `**Total Members:** ${totalMembers.toLocaleString()}\n` +
          `**Shard Ping:** ${shardPing}ms`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const perPage = 10;
      const maxPages = Math.ceil(guilds.length / perPage);
      let currentPage = parseInt(args[1]) || 1;

      if (currentPage < 1) currentPage = 1;
      if (currentPage > maxPages) currentPage = maxPages;

      const startIndex = (currentPage - 1) * perPage;
      const endIndex = startIndex + perPage;
      const pageGuilds = guilds.slice(startIndex, endIndex);

      let serverList = "";
      pageGuilds.forEach((guild, index) => {
        const globalIndex = startIndex + index + 1;
        serverList += `**${globalIndex}.** ${guild.name}\n`;
        serverList += `└─ ID: \`${guild.id}\` | Members: ${guild.memberCount.toLocaleString()}\n`;
      });

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(serverList || "No servers found.")
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Page ${currentPage}/${maxPages}` +
          (maxPages > 1 ? ` | Use \`shard ${shardId} <page>\` for other pages` : "")
        )
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default new ShardCommand();
