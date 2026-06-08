import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import emoji from "#config/emoji";
import { config } from "#config/config";
import { db } from "#database/DatabaseManager";

class SetNameCommand extends Command {
  constructor() {
    super({
      name: "setname",
      description: "Change the bot's nickname in this server",
      usage: "setname <name | reset>",
      aliases: ["botnick", "setnick"],
      category: "Owner",
      examples: ["setname Raze", "setname MyBot", "setname reset"],
      cooldown: 5,
      ownerOnly: true,
      permissions: [PermissionFlagsBits.ChangeNickname],
    });
  }

  async execute({ client, message, args }) {
    try {
      if (!config.ownerIds?.includes(message.author.id)) {
        return message.reply({ content: `${emoji.get("cross")} Owner only.` });
      }

      const newName = args.join(" ").trim();
      if (!newName) {
        return message.reply({
          content: `${emoji.get("cross")} Please provide a name.\n**Usage:** \`${this.usage}\``,
        });
      }

      const guildId = message.guild.id;
      const me = message.guild.members.me;

      if (newName.toLowerCase() === "reset") {
        await me.setNickname(null);
        db.setBotNick(guildId, null);

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${emoji.get("check")} Nickname Reset**`)
        );
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Bot nickname has been reset to the default in **${message.guild.name}**.`
          )
        );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (newName.length > 32) {
        return message.reply({ content: `${emoji.get("cross")} Nickname must be 32 characters or fewer.` });
      }

      await me.setNickname(newName);
      db.setBotNick(guildId, newName);

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${emoji.get("check")} Nickname Updated**`)
      );
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${message.guild.name}\n` +
          `**New Nickname:** \`${newName}\`\n\n` +
          `The bot now appears as **${newName}** in this server.\n` +
          `To reset: \`setname reset\``
        )
      );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    } catch (error) {
      return message.reply({ content: `${emoji.get("cross")} Failed to set nickname: ${error.message}` });
    }
  }
}

export default new SetNameCommand();
