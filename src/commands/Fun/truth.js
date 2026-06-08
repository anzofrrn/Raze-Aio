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

const truths = [
  "What is your biggest fear?",
  "What is the most embarrassing thing you've ever done?",
  "What is your biggest regret?",
  "What is the craziest thing you've done for love?",
  "What is the biggest lie you've ever told?",
  "What was your most awkward date?",
  "What is your biggest insecurity?",
  "Have you ever cheated on a test?",
  "What is your most embarrassing childhood memory?",
  "What is the worst thing you've ever said to someone?",
  "Have you ever had a crush on a friend's partner?",
  "What is the most childish thing you still do?",
  "What secret have you never told anyone?",
  "What is your guilty pleasure?",
  "Have you ever lied to get out of trouble?",
  "What is the weirdest thing you've ever eaten?",
  "What is your biggest pet peeve?",
  "Have you ever pretended to like a gift you hated?",
  "What is your most irrational fear?",
  "What is the most embarrassing thing in your search history?",
  "Have you ever had a paranormal experience?",
  "What is the dumbest thing you've ever done?",
  "What is your most unpopular opinion?",
  "What is the longest you've gone without showering?",
  "Have you ever ghosted someone?",
  "What is your biggest turn-off?",
  "Have you ever been caught doing something embarrassing?",
  "What is the worst advice you've ever given?",
  "What is your most embarrassing nickname?",
  "What would you do if you won the lottery?",
];

class TruthCommand extends Command {
  constructor() {
    super({
      name: "truth",
      description: "Get a random truth question",
      usage: "truth",
      aliases: ["truthful"],
      category: "Fun",
      examples: ["truth"],
      cooldown: 5,
      enabledSlash: true,
      slashData: { name: "truth", description: "Get a random truth question" },
    });
  }

  async execute({ client, message, args }) {
    try {
      const randomTruth = truths[Math.floor(Math.random() * truths.length)];

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("info")} **Truth Question**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${message.author.username}**, answer this honestly:\n\n` +
            `*${randomTruth}*`
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
          `*Be honest! No lying allowed.*`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("TruthCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while getting a truth question.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const randomTruth = truths[Math.floor(Math.random() * truths.length)];
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("info")} **Truth Question**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const section = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${interaction.user.username}**, answer this honestly:\n\n*${randomTruth}*`)).setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ dynamic: true })));
      container.addSectionComponents(section);
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Be honest! No lying allowed.*`));
      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred.`, ephemeral: true });
    }
  }
}

export default new TruthCommand();
