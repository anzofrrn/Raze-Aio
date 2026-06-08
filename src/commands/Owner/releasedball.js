import { EmbedBuilder } from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";
import { musicStateManager } from "#utils/MusicStateManager";

export default {
  name: "releasedball",
  description: "Restore all music player states after restart",
  usage: "releasedball",
  aliases: ["restoremusic", "loadstate", "musicrestore"],
  category: "Owner",
  cooldown: 10,
  ownerOnly: true,

  async execute({ client, message, args }) {
    if (!config.ownerIds?.includes(message.author.id)) {
      return;
    }

    const backupInfo = musicStateManager.getBackupInfo();
    if (!backupInfo) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} No Backup Found`)
        .setDescription("There is no music state backup to restore. Use `getuprestart` before restarting to create a backup.");

      return message.reply({ embeds: [embed] });
    }

    const ageMinutes = Math.floor(backupInfo.age / 1000 / 60);
    const loadingEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${emoji.get("loading") || "⏳"} Restoring Music States...`)
      .setDescription(
        `Found backup with **${backupInfo.playerCount}** player(s) from **${ageMinutes}** minute(s) ago.\n\n` +
        `Please wait while I restore all music players...`
      );

    const reply = await message.reply({ embeds: [loadingEmbed] });

    try {
      const result = await musicStateManager.restoreAllPlayers(client);

      if (result.success) {
        let description = 
          `**Restored:** ${result.restored}/${result.total} player(s)\n` +
          `**Failed:** ${result.failed} player(s)\n\n`;

        if (result.restored > 0) {
          description += `**What was restored:**\n` +
            `├─ Voice channel connections\n` +
            `├─ Playing tracks & queues\n` +
            `├─ Volume settings\n` +
            `├─ Playback positions\n` +
            `└─ Player configurations\n\n`;
        }

        if (result.errors && result.errors.length > 0) {
          description += `**Errors:**\n`;
          result.errors.slice(0, 5).forEach(err => {
            description += `• ${err}\n`;
          });
          if (result.errors.length > 5) {
            description += `• ... and ${result.errors.length - 5} more\n`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("check")} Music State Restore Complete`)
          .setDescription(description)
          .setTimestamp();

        await reply.edit({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("cross")} Restore Failed`)
          .setDescription(`Failed to restore music states: ${result.error}`);

        await reply.edit({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Restore Error`)
        .setDescription(`An error occurred: ${error.message}`);

      await reply.edit({ embeds: [embed] });
    }
  },
};
