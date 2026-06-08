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
import path from "path";
import { pathToFileURL } from "url";

class ReloadCommand extends Command {
  constructor() {
    super({
      name: "reload",
      description: "Reload a specific command",
      usage: "reload <command_name>",
      aliases: ["rl"],
      category: "Owner",
      examples: ["reload help", "reload play"],
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
          content: `${emoji.get("cross")} Please provide a command name to reload!\n**Usage:** \`${this.usage}\``,
        });
      }

      const commandName = args[0].toLowerCase();
      const command = client.commands.get(commandName) || 
                      client.commands.find(cmd => cmd.aliases?.includes(commandName));

      if (!command) {
        return message.reply({
          content: `${emoji.get("cross")} Command \`${commandName}\` not found!`,
        });
      }

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("reload")} **Command Reload**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Command:** \`${command.name}\`\n` +
          `**Category:** ${command.category}\n\n` +
          `*Note: Full reload requires bot restart. This is a placeholder for hot-reload functionality.*`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("ReloadCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while reloading the command.`,
      });
    }
  }
}

export default new ReloadCommand();
