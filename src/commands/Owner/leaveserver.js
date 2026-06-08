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

class LeaveServerCommand extends Command {
  constructor() {
    super({
      name: "leaveserver",
      description: "Make the bot leave a specific server",
      usage: "leaveserver <server_id>",
      aliases: ["leave", "leaveguild"],
      category: "Owner",
      examples: ["leaveserver 123456789"],
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

      const guild = client.guilds.cache.get(serverId);

      if (!guild) {
        return message.reply({
          content: `${emoji.get("cross")} I'm not in a server with that ID!`,
        });
      }

      const guildName = guild.name;
      const memberCount = guild.memberCount;

      await guild.leave();

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("check")} **Left Server**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${guildName}\n` +
          `**ID:** \`${serverId}\`\n` +
          `**Members:** ${memberCount}`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("LeaveServerCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while leaving the server.`,
      });
    }
  }
}

export default new LeaveServerCommand();
