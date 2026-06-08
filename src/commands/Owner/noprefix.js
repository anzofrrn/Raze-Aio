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

class NoPrefixCommand extends Command {
  constructor() {
    super({
      name: "noprefix",
      description: "Give or remove no-prefix access for a user. Users with noprefix can run all commands without any prefix.",
      usage: "noprefix <add|remove|list> [@user | user_id]",
      aliases: ["np", "nopre"],
      category: "Owner",
      examples: [
        "noprefix add @Void",
        "noprefix add 123456789012345678",
        "noprefix remove @Void",
        "noprefix list",
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

      if (!client.noPrefixUsers) client.noPrefixUsers = new Set();

      const action = args[0]?.toLowerCase();

      if (!action || !["add", "remove", "list"].includes(action)) {
        return message.reply({
          components: [this._usageContainer()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // LIST
      if (action === "list") {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${emoji.get("info")} No-Prefix Users**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        if (client.noPrefixUsers.size === 0) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `No users currently have no-prefix access.\nUse \`noprefix add @user\` to grant it.`
            )
          );
        } else {
          let list = "";
          let i = 0;
          for (const uid of client.noPrefixUsers) {
            i++;
            let user = null;
            try { user = await client.users.fetch(uid); } catch (_) {}
            list += `**${i}.** ${user ? user.tag : "Unknown User"} (\`${uid}\`)\n`;
          }
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(list.trim())
          );
        }

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Total:** \`${client.noPrefixUsers.size}\` user${client.noPrefixUsers.size !== 1 ? "s" : ""}`
          )
        );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // RESOLVE USER
      const rawTarget = args[1];
      if (!rawTarget) {
        return message.reply({
          content: `${emoji.get("cross")} Please mention a user or provide their ID.\n**Usage:** \`${this.usage}\``,
        });
      }

      const userId = rawTarget.replace(/[<@!>]/g, "").trim();
      if (!/^\d{17,20}$/.test(userId)) {
        return message.reply({
          content: `${emoji.get("cross")} That doesn't look like a valid user mention or ID.`,
        });
      }

      let user = null;
      try { user = await client.users.fetch(userId); } catch (_) {}

      const displayName = user ? `**${user.tag}**` : `\`${userId}\``;

      // ADD
      if (action === "add") {
        if (client.noPrefixUsers.has(userId)) {
          return message.reply({
            content: `${emoji.get("cross")} ${displayName} already has no-prefix access!`,
          });
        }

        client.noPrefixUsers.add(userId);
        db.setNoPrefix(userId, true);

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${emoji.get("check")} No-Prefix Granted**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user ? `${user.tag} (<@${userId}>)` : `\`${userId}\``}\n` +
            `**ID:** \`${userId}\`\n\n` +
            `This user can now run all commands without any prefix.\n` +
            `To revoke: \`noprefix remove ${userId}\``
          )
        );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // REMOVE
      if (action === "remove") {
        if (!client.noPrefixUsers.has(userId)) {
          return message.reply({
            content: `${emoji.get("cross")} ${displayName} doesn't have no-prefix access.`,
          });
        }

        client.noPrefixUsers.delete(userId);
        db.setNoPrefix(userId, false);

        let user2 = user;
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${emoji.get("check")} No-Prefix Revoked**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user2 ? `${user2.tag} (<@${userId}>)` : `\`${userId}\``}\n` +
            `**ID:** \`${userId}\`\n\n` +
            `This user must now use a prefix to run commands.`
          )
        );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }

    } catch (error) {
      client.logger?.error("NoPrefixCommand", `Error: ${error.message}`, error);
      return message.reply({
        content: `${emoji.get("cross")} An error occurred: ${error.message}`,
      });
    }
  }

  _usageContainer() {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${emoji.get("info")} No-Prefix - Usage**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**What it does:**\n` +
        `Users with no-prefix can run any command without typing a prefix.\n\n` +
        `**Subcommands:**\n` +
        `\`noprefix add @user\` - Grant no-prefix to a user\n` +
        `\`noprefix remove @user\` - Revoke no-prefix from a user\n` +
        `\`noprefix list\` - List all users with no-prefix access\n\n` +
        `Owner only command.`
      )
    );
    return container;
  }
}

export default new NoPrefixCommand();
