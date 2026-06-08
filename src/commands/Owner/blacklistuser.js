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

class BlacklistUserCommand extends Command {
  constructor() {
    super({
      name: "blacklistuser",
      description: "Blacklist a user from using the bot",
      usage: "blacklistuser <user_id> [reason]",
      aliases: ["buser", "userbl", "blacklist-user"],
      category: "Owner",
      examples: ["blacklistuser 123456789 Spamming commands"],
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
      const reason = args.slice(1).join(" ") || "No reason provided";

      if (!/^\d{17,19}$/.test(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} Invalid user ID format!`,
        });
      }

      if (config.ownerIds?.includes(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} You cannot blacklist a bot owner!`,
        });
      }

      if (!client.blacklistedUsers) {
        client.blacklistedUsers = new Map();
      }

      if (client.blacklistedUsers.has(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} This user is already blacklisted!`,
        });
      }

      client.blacklistedUsers.set(userId, {
        reason,
        timestamp: Date.now(),
        moderator: message.author.id,
      });

      let user = null;
      try {
        user = await client.users.fetch(userId);
      } catch (e) {}

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("blacklist")} **User Blacklisted**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const content =
        `**User:** ${user ? user.tag : "Unknown"}\n` +
        `**ID:** \`${userId}\`\n` +
        `**Reason:** ${reason}\n` +
        `**Blacklisted by:** ${message.author.tag}`;

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
      client.logger?.error("BlacklistUserCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new BlacklistUserCommand();
