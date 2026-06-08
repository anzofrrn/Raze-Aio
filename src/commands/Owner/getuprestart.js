import { EmbedBuilder } from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";
import { musicStateManager } from "#utils/MusicStateManager";

export default {
  name: "getuprestart",
  description: "Backup all music player states before restart",
  usage: "getuprestart",
  aliases: ["backupmusic", "savestate", "musicbackup"],
  category: "Owner",
  cooldown: 10,
  ownerOnly: true,

  async execute({ client, message, args }) {
    if (!config.ownerIds?.includes(message.author.id)) {
      return;
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${emoji.get("loading") || "⏳"} Backing Up Music States...`)
      .setDescription("Please wait while I backup all active music players...");

    const reply = await message.reply({ embeds: [loadingEmbed] });

    try {
      const result = await musicStateManager.backupAllPlayers(client);

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("check")} Music State Backup Complete`)
          .setDescription(
            `Successfully backed up **${result.count}** active player(s).\n\n` +
            `**What was saved:**\n` +
            `├─ Current playing tracks\n` +
            `├─ Queue tracks\n` +
            `├─ Volume settings\n` +
            `├─ Playback position\n` +
            `├─ Repeat modes\n` +
            `└─ 24/7 mode settings\n\n` +
            `*You can now safely restart the bot. Use \`releasedball\` after restart to restore.*`
          )
          .setTimestamp();

        await reply.edit({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("cross")} Backup Failed`)
          .setDescription(`Failed to backup music states: ${result.error}`);

        await reply.edit({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Backup Error`)
        .setDescription(`An error occurred: ${error.message}`);

      await reply.edit({ embeds: [embed] });
    }
  },
};
