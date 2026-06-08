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
import { db } from "#database/DatabaseManager";

class SetBioCommand extends Command {
  constructor() {
    super({
      name: "setbio",
      description: "Set a custom bot bio displayed in botinfo for this server",
      usage: "setbio <bio text | reset>",
      aliases: ["botbio", "setabout"],
      category: "Owner",
      examples: [
        "setbio The best multipurpose bot in town",
        "setbio reset",
      ],
      cooldown: 5,
      ownerOnly: true,
    });
  }

  async execute({ client, message, args }) {
    try {
      if (!config.ownerIds?.includes(message.author.id)) {
        return message.reply({ content: `${emoji.get("cross")} Owner only.` });
      }

      const bio = args.join(" ").trim();
      if (!bio) {
        return message.reply({
          content: `${emoji.get("cross")} Please provide a bio.\n**Usage:** \`${this.usage}\``,
        });
      }

      const guildId = message.guild.id;

      if (bio.toLowerCase() === "reset") {
        db.setBotBio(guildId, null);
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${emoji.get("check")} Bot Bio Reset**`)
        );
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Bot bio has been cleared for **${message.guild.name}**.`
          )
        );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (bio.length > 190) {
        return message.reply({
          content: `${emoji.get("cross")} Bio must be 190 characters or fewer (currently ${bio.length}).`,
        });
      }

      db.setBotBio(guildId, bio);

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${emoji.get("check")} Bot Bio Updated**`)
      );
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${message.guild.name}\n` +
          `**New Bio:** ${bio}\n\n` +
          `To clear: \`setbio reset\``
        )
      );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    } catch (error) {
      return message.reply({ content: `${emoji.get("cross")} Failed to set bio: ${error.message}` });
    }
  }
}

export default new SetBioCommand();
