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

class ReloadAllCommand extends Command {
  constructor() {
    super({
      name: "reloadall",
      description: "Reload all commands",
      usage: "reloadall",
      aliases: ["rla", "reloadallcmds"],
      category: "Owner",
      examples: ["reloadall"],
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

      const loadingMsg = await message.reply({
        content: `${emoji.get("loading")} Reloading all commands...`,
      });

      const commandCount = client.commands?.size || 0;

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("reload")} **Commands Reloaded**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Total Commands:** ${commandCount}\n\n` +
          `*Note: Full reload requires bot restart. For complete reload, use the restart command or restart the bot process.*`
        )
      );

      await loadingMsg.edit({
        content: null,
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("ReloadAllCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while reloading commands.`,
      });
    }
  }
}

export default new ReloadAllCommand();
