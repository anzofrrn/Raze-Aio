import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";

const dares = [
  "Give an insult to every person in the room.",
  "Put your toe in your mouth. If you cannot do that then you have to put someone else's toe in your mouth.",
  "Show the most embarrassing photo on your phone.",
  "Show the last five people you texted and what the messages said.",
  "Let the rest of the group DM someone from your Instagram account.",
  "Eat a raw piece of garlic.",
  "Do 100 squats.",
  "Keep three ice cubes in your mouth until they melt.",
  "Say something dirty to the person on your left.",
  "Give a foot massage to the person on your right.",
  "Put 10 different available liquids into a cup and drink it.",
  "Yell out the first word that comes to your mind.",
  "Give a lap dance to someone of your choice.",
  "Remove four items of clothing.",
  "Like the first 15 posts on your Facebook newsfeed.",
  "Eat a spoonful of mustard.",
  "Keep your eyes closed until it's your go again.",
  "Send a sext to the last person in your phonebook.",
  "Say two honest things about everyone else in the group.",
  "Try and make the group laugh as quickly as possible.",
  "Pretend to be the person to your right for 10 minutes.",
  "Eat a snack without using your hands.",
  "Try to do stand up comedy in front of the other players.",
  "Do your best impression of a celebrity.",
  "Speak in an accent for the next 3 rounds.",
  "Let someone draw on your face with a marker.",
  "Post an embarrassing status on social media.",
  "Do 20 push-ups right now.",
  "Sing the chorus of your favorite song.",
  "Dance without any music for 1 minute.",
];

class DareCommand extends Command {
  constructor() {
    super({
      name: "dare",
      description: "Get a random dare challenge",
      usage: "dare",
      aliases: ["daredevil"],
      category: "Fun",
      examples: ["dare"],
      cooldown: 5,
      enabledSlash: true,
      slashData: { name: "dare", description: "Get a random dare challenge" },
    });
  }

  async execute({ client, message, args }) {
    try {
      const randomDare = dares[Math.floor(Math.random() * dares.length)];

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("game")} **Dare Challenge**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${message.author.username}**, here's your dare:\n\n` +
            `*${randomDare}*`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            message.author.displayAvatarURL({ dynamic: true })
          )
        );

      container.addSectionComponents(section);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `*Good luck completing this dare!*`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("DareCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while getting a dare.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const randomDare = dares[Math.floor(Math.random() * dares.length)];
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("game")} **Dare Challenge**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const section = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${interaction.user.username}**, here's your dare:\n\n*${randomDare}*`)).setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ dynamic: true })));
      container.addSectionComponents(section);
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Good luck completing this dare!*`));
      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred.`, ephemeral: true });
    }
  }
}

export default new DareCommand();
