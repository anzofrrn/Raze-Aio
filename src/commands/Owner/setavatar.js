import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";
import { config } from "#config/config";
import { db } from "#database/DatabaseManager";

const IMAGE_URL_REGEX = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;

class SetAvatarCommand extends Command {
  constructor() {
    super({
      name: "setavatar",
      description: "Set a custom bot avatar URL per server (shown in botinfo)",
      usage: "setavatar <image_url | reset>",
      aliases: ["botavatar", "setpfp"],
      category: "Owner",
      examples: [
        "setavatar https://i.imgur.com/example.png",
        "setavatar reset",
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

      const guildId = message.guild.id;
      const attachment = message.attachments.first();
      let avatarUrl = attachment?.url || args[0]?.trim();

      if (!avatarUrl) {
        return message.reply({
          content: `${emoji.get("cross")} Please provide an image URL or attach an image.\n**Usage:** \`${this.usage}\``,
        });
      }

      if (avatarUrl.toLowerCase() === "reset") {
        db.setBotAvatar(guildId, null);
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${emoji.get("check")} Bot Avatar Reset**`)
        );
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Bot avatar has been cleared for **${message.guild.name}**. The default avatar will show.`
          )
        );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (!IMAGE_URL_REGEX.test(avatarUrl)) {
        return message.reply({
          content: `${emoji.get("cross")} That doesn't look like a valid image URL. Supported: .png .jpg .gif .webp`,
        });
      }

      db.setBotAvatar(guildId, avatarUrl);

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${emoji.get("check")} Bot Avatar Updated**`)
      );
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${message.guild.name}\n` +
          `**Avatar URL:** [View Image](${avatarUrl})\n\n` +
          `This avatar will appear in \`botinfo\` for this server.\n` +
          `To reset: \`setavatar reset\``
        )
      );
      try {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(avatarUrl)
          )
        );
      } catch (_) {}

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    } catch (error) {
      return message.reply({ content: `${emoji.get("cross")} Failed to set avatar: ${error.message}` });
    }
  }
}

export default new SetAvatarCommand();
