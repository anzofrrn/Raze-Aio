import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";

class MemeCommand extends Command {
  constructor() {
    super({
      name: "meme",
      description: "Get a random meme from Reddit",
      usage: "meme",
      aliases: ["reddit", "randommeme"],
      category: "Fun",
      examples: ["meme"],
      cooldown: 5,
      enabledSlash: true,
      slashData: {
        name: "meme",
        description: "Get a random meme from Reddit",
      },
    });
  }

  async execute({ client, message, args }) {
    try {
      const subreddits = ["memes", "dankmemes", "wholesomememes", "me_irl"];
      const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
      
      const response = await fetch(`https://www.reddit.com/r/${randomSubreddit}/random/.json`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch meme");
      }

      const data = await response.json();
      
      let meme;
      if (Array.isArray(data)) {
        meme = data[0]?.data?.children?.[0]?.data;
      } else {
        meme = data?.data?.children?.[0]?.data;
      }

      if (!meme || meme.over_18) {
        return message.reply({
          content: `${emoji.get("cross")} Couldn't find a suitable meme. Please try again!`,
        });
      }

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("fun")} **${meme.title}**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      if (meme.url && (meme.url.endsWith('.jpg') || meme.url.endsWith('.png') || meme.url.endsWith('.gif'))) {
        const gallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder().setURL(meme.url)
          );
        container.addMediaGalleryComponents(gallery);
      }

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Subreddit:** r/${randomSubreddit} | **Upvotes:** ${meme.ups || 0}`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("MemeCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} Failed to fetch a meme. Please try again later!`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const subreddits = ["memes", "dankmemes", "wholesomememes", "me_irl"];
      const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
      
      const response = await fetch(`https://www.reddit.com/r/${randomSubreddit}/random/.json`);
      if (!response.ok) throw new Error("Failed to fetch meme");

      const data = await response.json();
      let meme = Array.isArray(data) ? data[0]?.data?.children?.[0]?.data : data?.data?.children?.[0]?.data;

      if (!meme || meme.over_18) {
        return interaction.reply({ content: `${emoji.get("cross")} Couldn't find a suitable meme. Try again!`, ephemeral: true });
      }

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("fun")} **${meme.title}**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      if (meme.url && (meme.url.endsWith('.jpg') || meme.url.endsWith('.png') || meme.url.endsWith('.gif'))) {
        container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(meme.url)));
      }

      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Subreddit:** r/${randomSubreddit} | **Upvotes:** ${meme.ups || 0}`));

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} Failed to fetch a meme. Try again later!`, ephemeral: true });
    }
  }
}

export default new MemeCommand();
