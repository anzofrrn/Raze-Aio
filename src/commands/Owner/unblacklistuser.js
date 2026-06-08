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

class UnblacklistUserCommand extends Command {
  constructor() {
    super({
      name: "unblacklistuser",
      description: "Remove a user from the blacklist",
      usage: "unblacklistuser <user_id>",
      aliases: ["unbuser", "userunbl", "unblacklist-user"],
      category: "Owner",
      examples: ["unblacklistuser 123456789"],
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

      if (!/^\d{17,19}$/.test(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} Invalid user ID format!`,
        });
      }

      if (!client.blacklistedUsers || !client.blacklistedUsers.has(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} This user is not blacklisted!`,
        });
      }

      client.blacklistedUsers.delete(userId);

      let user = null;
      try {
        user = await client.users.fetch(userId);
      } catch (e) {}

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("whitelist")} **User Unblacklisted**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const content =
        `**User:** ${user ? user.tag : "Unknown"}\n` +
        `**ID:** \`${userId}\`\n` +
        `**Unblacklisted by:** ${message.author.tag}`;

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
      client.logger?.error("UnblacklistUserCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new UnblacklistUserCommand();
