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

class BlacklistServerCommand extends Command {
  constructor() {
    super({
      name: "blacklistserver",
      description: "Blacklist a server from using the bot",
      usage: "blacklistserver <server_id> [reason]",
      aliases: ["bserver", "serverbl", "blacklist-server"],
      category: "Owner",
      examples: ["blacklistserver 123456789 TOS violation"],
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
        return message.reply({
          content: `${emoji.get("cross")} Please provide a server ID!\n**Usage:** \`${this.usage}\``,
        });
      }

      const serverId = args[0];
      const reason = args.slice(1).join(" ") || "No reason provided";

      if (!/^\d{17,19}$/.test(serverId)) {
        return message.reply({
          content: `${emoji.get("cross")} Invalid server ID format!`,
        });
      }

      if (!client.blacklistedServers) {
        client.blacklistedServers = new Map();
      }

      if (client.blacklistedServers.has(serverId)) {
        return message.reply({
          content: `${emoji.get("cross")} This server is already blacklisted!`,
        });
      }

      client.blacklistedServers.set(serverId, {
        reason,
        timestamp: Date.now(),
        moderator: message.author.id,
      });

      const guild = client.guilds.cache.get(serverId);
      const guildName = guild ? guild.name : "Unknown";

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("blacklist")} **Server Blacklisted**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${guildName}\n` +
          `**ID:** \`${serverId}\`\n` +
          `**Reason:** ${reason}\n` +
          `**Blacklisted by:** ${message.author.tag}`
        )
      );

      if (guild) {
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `*The bot will now leave this server.*`
          )
        );
        await guild.leave().catch(() => {});
      }

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("BlacklistServerCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new BlacklistServerCommand();
