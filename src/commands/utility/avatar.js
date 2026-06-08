import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";

class AvatarCommand extends Command {
  constructor() {
    super({
      name: "avatar",
      description: "View a user's avatar in full size",
      usage: "avatar [@user]",
      aliases: ["av", "pfp", "dp", "icon"],
      category: "utility",
      examples: ["avatar", "avatar @user"],
      cooldown: 5,
      enabledSlash: true,
      slashData: {
        name: "avatar",
        description: "View a user's avatar in full size",
        options: [
          { name: "user", description: "The user to view avatar for", type: 6, required: false },
        ],
      },
    });
  }

  async execute({ client, message, args }) {
    try {
      const target = message.mentions.users.first() || 
                     (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) ||
                     message.author;

      const avatarURL = target.displayAvatarURL({ 
        dynamic: true, 
        size: 4096 
      });

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("avatar")} **${target.username}'s Avatar**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const gallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder().setURL(avatarURL)
        );
      container.addMediaGalleryComponents(gallery);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Download Avatar")
          .setStyle(ButtonStyle.Link)
          .setURL(avatarURL)
      );

      container.addActionRowComponents(row);

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("AvatarCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while fetching the avatar.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const target = interaction.options.getUser("user") || interaction.user;
      const avatarURL = target.displayAvatarURL({ dynamic: true, size: 4096 });

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("avatar")} **${target.username}'s Avatar**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      const gallery = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(avatarURL));
      container.addMediaGalleryComponents(gallery);

      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Download Avatar").setStyle(ButtonStyle.Link).setURL(avatarURL));
      container.addActionRowComponents(row);

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred while fetching the avatar.`, ephemeral: true });
    }
  }
}

export default new AvatarCommand();
