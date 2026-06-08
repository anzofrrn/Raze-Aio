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

class UnblacklistServerCommand extends Command {
  constructor() {
    super({
      name: "unblacklistserver",
      description: "Remove a server from the blacklist",
      usage: "unblacklistserver <server_id>",
      aliases: ["unbserver", "serverunbl", "unblacklist-server"],
      category: "Owner",
      examples: ["unblacklistserver 123456789"],
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

      if (!/^\d{17,19}$/.test(serverId)) {
        return message.reply({
          content: `${emoji.get("cross")} Invalid server ID format!`,
        });
      }

      if (!client.blacklistedServers || !client.blacklistedServers.has(serverId)) {
        return message.reply({
          content: `${emoji.get("cross")} This server is not blacklisted!`,
        });
      }

      client.blacklistedServers.delete(serverId);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("whitelist")} **Server Unblacklisted**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server ID:** \`${serverId}\`\n` +
          `**Unblacklisted by:** ${message.author.tag}`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("UnblacklistServerCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new UnblacklistServerCommand();
