import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import { config } from "#config/config";
import { logger } from "#utils/logger";
import emoji from "#config/emoji";
import ms from "ms";

class GiveawayStartCommand extends Command {
  constructor() {
    super({
      name: "gstart",
      description: "Start a new giveaway in the server",
      usage: "gstart <duration> <winners> <prize>",
      aliases: ["gcreate", "giveaway-start", "giveawaystart"],
      category: "giveaway",
      examples: [
        "gstart 1h 1 Nitro Classic",
        "gstart 24h 3 Discord Nitro",
        "gstart 7d 5 $50 Amazon Gift Card"
      ],
      cooldown: 10,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enabledSlash: true,
      slashData: {
        name: "gstart",
        description: "Start a new giveaway",
        options: [
          {
            name: "duration",
            description: "Duration of the giveaway (e.g., 1h, 24h, 7d)",
            type: 3,
            required: true
          },
          {
            name: "winners",
            description: "Number of winners",
            type: 4,
            required: true,
            min_value: 1,
            max_value: 20
          },
          {
            name: "prize",
            description: "The prize for the giveaway",
            type: 3,
            required: true
          },
          {
            name: "channel",
            description: "Channel to host the giveaway (defaults to current)",
            type: 7,
            required: false,
            channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement]
          }
        ]
      }
    });
  }

  async execute({ client, message, args }) {
    try {
      if (!args.length || args.length < 3) {
        return message.reply({
          components: [this._createHelpContainer()],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const durationArg = args[0];
      const winnersArg = args[1];
      const prize = args.slice(2).join(" ");

      const duration = ms(durationArg);
      if (!duration || duration < 10000 || duration > 2592000000) {
        return this._sendError(
          message,
          "Invalid Duration",
          `**Please provide a valid duration.**\n\n**${emoji.get("folder")} Valid Formats:**\n├─ \`10s\` - 10 seconds (minimum)\n├─ \`1m\` - 1 minute\n├─ \`1h\` - 1 hour\n├─ \`1d\` - 1 day\n└─ \`30d\` - 30 days (maximum)`
        );
      }

      const winners = parseInt(winnersArg);
      if (isNaN(winners) || winners < 1 || winners > 20) {
        return this._sendError(
          message,
          "Invalid Winners",
          `**Please provide a valid number of winners.**\n\n**${emoji.get("folder")} Requirements:**\n├─ **Minimum:** 1 winner\n└─ **Maximum:** 20 winners`
        );
      }

      if (!prize || prize.length < 1 || prize.length > 256) {
        return this._sendError(
          message,
          "Invalid Prize",
          `**Please provide a valid prize.**\n\n**${emoji.get("folder")} Requirements:**\n├─ **Minimum:** 1 character\n└─ **Maximum:** 256 characters`
        );
      }

      const channel = message.channel;
      const endTime = Date.now() + duration;

      const giveawayContainer = this._createGiveawayContainer(
        prize,
        winners,
        endTime,
        message.author,
        []
      );

      const giveawayMessage = await channel.send({
        components: [giveawayContainer],
        flags: MessageFlags.IsComponentsV2
      });

      this._setupGiveawayCollector(giveawayMessage, prize, winners, endTime, message.author, client);

      return this._sendSuccess(
        message,
        "Giveaway Started",
        `**Your giveaway has been created!**\n\n**${emoji.get("folder")} Details:**\n├─ **Prize:** ${prize}\n├─ **Winners:** ${winners}\n├─ **Duration:** ${this._formatDuration(duration)}\n├─ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n└─ **Channel:** ${channel}`
      );
    } catch (error) {
      logger.error("GiveawayStartCommand", "Error starting giveaway:", error);
      return this._sendError(message, "Error", `An unexpected error occurred:\n\`\`\`\n${error.message}\n\`\`\``);
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const durationArg = interaction.options.getString("duration");
      const winners = interaction.options.getInteger("winners");
      const prize = interaction.options.getString("prize");
      const channel = interaction.options.getChannel("channel") || interaction.channel;

      const duration = ms(durationArg);
      if (!duration || duration < 10000 || duration > 2592000000) {
        return interaction.reply({
          components: [this._createErrorContainer(
            "Invalid Duration",
            `**Please provide a valid duration.**\n\n**${emoji.get("folder")} Valid Formats:**\n├─ \`10s\` - 10 seconds (minimum)\n├─ \`1m\` - 1 minute\n├─ \`1h\` - 1 hour\n├─ \`1d\` - 1 day\n└─ \`30d\` - 30 days (maximum)`
          )],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      if (prize.length > 256) {
        return interaction.reply({
          components: [this._createErrorContainer(
            "Invalid Prize",
            `**Prize must be 256 characters or less.**\n\n**Current length:** ${prize.length} characters`
          )],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      const endTime = Date.now() + duration;

      const giveawayContainer = this._createGiveawayContainer(
        prize,
        winners,
        endTime,
        interaction.user,
        []
      );

      const giveawayMessage = await channel.send({
        components: [giveawayContainer],
        flags: MessageFlags.IsComponentsV2
      });

      this._setupGiveawayCollector(giveawayMessage, prize, winners, endTime, interaction.user, client);

      return interaction.reply({
        components: [this._createSuccessContainer(
          "Giveaway Started",
          `**Your giveaway has been created!**\n\n**${emoji.get("folder")} Details:**\n├─ **Prize:** ${prize}\n├─ **Winners:** ${winners}\n├─ **Duration:** ${this._formatDuration(duration)}\n├─ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n└─ **Channel:** ${channel}`
        )],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    } catch (error) {
      logger.error("GiveawayStartCommand", "Slash command error:", error);
      return interaction.reply({
        components: [this._createErrorContainer("Error", `An unexpected error occurred:\n\`\`\`\n${error.message}\n\`\`\``)],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  }

  _createHelpContainer() {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${emoji.get("gift")} Giveaway Start`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const content = `**Create exciting giveaways for your server!**\n\n` +
      `**${emoji.get("folder")} Command Format:**\n` +
      `\`gstart <duration> <winners> <prize>\`\n\n` +
      `**${emoji.get("info")} Parameters:**\n` +
      `├─ **Duration:** How long the giveaway lasts (e.g., 1h, 24h, 7d)\n` +
      `├─ **Winners:** Number of winners (1-20)\n` +
      `└─ **Prize:** What you're giving away\n\n` +
      `**${emoji.get("check")} Examples:**\n` +
      `├─ \`gstart 1h 1 Discord Nitro\`\n` +
      `├─ \`gstart 24h 3 $10 Steam Gift Card\`\n` +
      `└─ \`gstart 7d 5 Special Role\`\n\n` +
      `**${emoji.get("timer")} Duration Formats:**\n` +
      `├─ \`s\` - Seconds (min: 10s)\n` +
      `├─ \`m\` - Minutes\n` +
      `├─ \`h\` - Hours\n` +
      `└─ \`d\` - Days (max: 30d)`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  _createGiveawayContainer(prize, winners, endTime, host, participants) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${emoji.get("gift")} GIVEAWAY ${emoji.get("gift")}`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const content = `**${emoji.get("trophy")} Prize:** ${prize}\n\n` +
      `**${emoji.get("folder")} Details:**\n` +
      `├─ **Winners:** ${winners}\n` +
      `├─ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n` +
      `├─ **Hosted by:** ${host}\n` +
      `└─ **Entries:** ${participants.length}\n\n` +
      `*Click the button below to enter!*`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_enter")
          .setLabel(`Enter Giveaway (${participants.length})`)
          .setStyle(ButtonStyle.Success)
          .setEmoji(emoji.get("tada"))
      )
    );

    return container;
  }

  _createEndedGiveawayContainer(prize, winners, host, winnersList) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${emoji.get("trophy")} GIVEAWAY ENDED ${emoji.get("trophy")}`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const winnersText = winnersList.length > 0
      ? winnersList.map((w, i) => `${i === winnersList.length - 1 ? '└─' : '├─'} ${w}`).join('\n')
      : '└─ No valid entries';

    const content = `**${emoji.get("trophy")} Prize:** ${prize}\n\n` +
      `**${emoji.get("tada")} Winner${winnersList.length !== 1 ? 's' : ''}:**\n${winnersText}\n\n` +
      `**Hosted by:** ${host}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_ended")
          .setLabel("Giveaway Ended")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
          .setEmoji(emoji.get("check"))
      )
    );

    return container;
  }

  _setupGiveawayCollector(message, prize, winnersCount, endTime, host, client) {
    const participants = new Set();
    const duration = endTime - Date.now();

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.customId === "giveaway_enter",
      time: duration
    });

    collector.on("collect", async (interaction) => {
      try {
        if (participants.has(interaction.user.id)) {
          participants.delete(interaction.user.id);
          await interaction.reply({
            content: `${emoji.get("cross")} You have left the giveaway!`,
            ephemeral: true
          });
        } else {
          participants.add(interaction.user.id);
          await interaction.reply({
            content: `${emoji.get("check")} You have entered the giveaway for **${prize}**!`,
            ephemeral: true
          });
        }

        const updatedContainer = this._createGiveawayContainer(
          prize,
          winnersCount,
          endTime,
          host,
          Array.from(participants)
        );

        await message.edit({
          components: [updatedContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error("GiveawayStartCommand", "Collector error:", error);
      }
    });

    collector.on("end", async () => {
      try {
        const participantArray = Array.from(participants);
        let winners = [];

        if (participantArray.length > 0) {
          const shuffled = participantArray.sort(() => Math.random() - 0.5);
          const selectedWinners = shuffled.slice(0, Math.min(winnersCount, participantArray.length));
          
          for (const winnerId of selectedWinners) {
            try {
              const user = await client.users.fetch(winnerId);
              winners.push(user.toString());
            } catch {
              winners.push(`<@${winnerId}>`);
            }
          }
        }

        const endedContainer = this._createEndedGiveawayContainer(prize, winnersCount, host, winners);

        await message.edit({
          components: [endedContainer],
          flags: MessageFlags.IsComponentsV2
        });

        if (winners.length > 0) {
          await message.reply({
            content: `${emoji.get("tada")} Congratulations ${winners.join(", ")}! You won **${prize}**!`
          });
        } else {
          await message.reply({
            content: `${emoji.get("cross")} No one entered the giveaway for **${prize}**.`
          });
        }
      } catch (error) {
        logger.error("GiveawayStartCommand", "End collector error:", error);
      }
    });
  }

  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  _createSuccessContainer(title, description) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${emoji.get("check")} ${title}`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  _createErrorContainer(title, description) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${emoji.get("cross")} ${title}`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  _sendSuccess(message, title, description) {
    return message.reply({
      components: [this._createSuccessContainer(title, description)],
      flags: MessageFlags.IsComponentsV2
    });
  }

  _sendError(message, title, description) {
    return message.reply({
      components: [this._createErrorContainer(title, description)],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }
}

export default new GiveawayStartCommand();
