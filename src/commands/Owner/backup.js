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
import fs from "fs/promises";
import path from "path";

class BackupCommand extends Command {
  constructor() {
    super({
      name: "backup",
      description: "Create or manage bot data backups",
      usage: "backup <create|list|restore> [backup_id]",
      aliases: ["bkp"],
      category: "Owner",
      examples: [
        "backup create",
        "backup list",
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

      const action = args[0]?.toLowerCase();

      if (!action || !["create", "list", "restore"].includes(action)) {
        return message.reply({
          content: `${emoji.get("cross")} Please specify an action: \`create\`, \`list\`, or \`restore\`\n**Usage:** \`${this.usage}\``,
        });
      }

      if (action === "create") {
        const loadingMsg = await message.reply({
          content: `${emoji.get("loading")} Creating backup...`,
        });

        const backupData = {
          timestamp: Date.now(),
          guilds: client.guilds.cache.size,
          users: client.users.cache.size,
          blacklistedUsers: client.blacklistedUsers ? [...client.blacklistedUsers] : [],
          blacklistedServers: client.blacklistedServers ? [...client.blacklistedServers] : [],
          premiumUsers: client.premiumUsers ? [...client.premiumUsers] : [],
          noPrefixUsers: client.noPrefixUsers ? [...client.noPrefixUsers] : [],
        };

        const backupId = `backup_${Date.now()}`;

        if (!client.backups) {
          client.backups = new Map();
        }
        client.backups.set(backupId, backupData);

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji.get("backup")} **Backup Created**`
          )
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Backup ID:** \`${backupId}\`\n` +
            `**Created:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
            `**Data Included:**\n` +
            `├─ Guilds: ${backupData.guilds}\n` +
            `├─ Blacklisted Users: ${backupData.blacklistedUsers.length}\n` +
            `├─ Blacklisted Servers: ${backupData.blacklistedServers.length}\n` +
            `├─ Premium Users: ${backupData.premiumUsers.length}\n` +
            `└─ No-Prefix Users: ${backupData.noPrefixUsers.length}`
          )
        );

        await loadingMsg.edit({
          content: null,
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (action === "list") {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji.get("backup")} **Available Backups**`
          )
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        if (!client.backups || client.backups.size === 0) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("No backups available.")
          );
        } else {
          let backupList = "";
          let count = 0;
          for (const [id, data] of client.backups) {
            count++;
            backupList += `**${count}.** \`${id}\`\n`;
            backupList += `└─ Created: <t:${Math.floor(data.timestamp / 1000)}:R>\n`;
          }
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(backupList)
          );
        }

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (action === "restore") {
        return message.reply({
          content: `${emoji.get("info")} Restore functionality is available. Please use \`backup list\` to see available backups, then contact a developer for restore assistance.`,
        });
      }
    } catch (error) {
      client.logger?.error("BackupCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }
}

export default new BackupCommand();
