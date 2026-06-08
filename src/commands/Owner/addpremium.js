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
import { config } from "#config/config";

class AddPremiumCommand extends Command {
  constructor() {
    super({
      name: "addpremium",
      description: "Grant premium status to a user",
      usage: "addpremium <user_id> [duration]",
      aliases: ["addpr", "grantpremium", "premium"],
      category: "Owner",
      examples: [
        "addpremium 123456789",
        "addpremium 123456789 30d",
        "addpremium 123456789 lifetime",
      ],
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
          content: `${emoji.get("cross")} Please provide a user ID!\n**Usage:** \`${this.usage}\``,
        });
      }

      const userId = args[0].replace(/[<@!>]/g, "");
      const duration = args[1]?.toLowerCase() || "lifetime";

      if (!/^\d{17,19}$/.test(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} Invalid user ID format!`,
        });
      }

      if (!client.premiumUsers) {
        client.premiumUsers = new Map();
      }

      let expiresAt = null;
      let durationText = "Lifetime";

      if (duration !== "lifetime") {
        const match = duration.match(/^(\d+)(d|h|m)$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          const multipliers = { d: 86400000, h: 3600000, m: 60000 };
          expiresAt = Date.now() + (value * multipliers[unit]);
          durationText = `${value} ${unit === "d" ? "day(s)" : unit === "h" ? "hour(s)" : "minute(s)"}`;
        }
      }

      client.premiumUsers.set(userId, {
        grantedBy: message.author.id,
        grantedAt: Date.now(),
        expiresAt,
      });

      let user = null;
      try {
        user = await client.users.fetch(userId);
      } catch (e) {}

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("premium")} **Premium Granted**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const content =
        `**User:** ${user ? user.tag : "Unknown"}\n` +
        `**ID:** \`${userId}\`\n` +
        `**Duration:** ${durationText}\n` +
        (expiresAt ? `**Expires:** <t:${Math.floor(expiresAt / 1000)}:R>` : `**Expires:** Never`);

      if (user) {
        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
              user.displayAvatarURL({ dynamic: true })
            )
          );
        container.addSectionComponents(section);
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );
      }

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("AddPremiumCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new AddPremiumCommand();
