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
import os from "os";

class NodeCommand extends Command {
  constructor() {
    super({
      name: "node",
      description: "Display bot node/system information",
      usage: "node",
      aliases: ["system", "sysinfo", "nodeinfo"],
      category: "Owner",
      examples: ["node"],
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

      const uptime = process.uptime();
      const uptimeStr = this._formatUptime(uptime);

      const memUsage = process.memoryUsage();
      const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
      const rss = (memUsage.rss / 1024 / 1024).toFixed(2);

      const systemMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = systemMem - freeMem;

      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model || "Unknown";
      const cpuCores = cpus.length;

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("node")} **Node Information**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const processInfo =
        `**Process Information:**\n` +
        `├─ **Node.js:** ${process.version}\n` +
        `├─ **Platform:** ${process.platform}\n` +
        `├─ **Architecture:** ${process.arch}\n` +
        `├─ **PID:** ${process.pid}\n` +
        `└─ **Uptime:** ${uptimeStr}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(processInfo)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const memoryInfo =
        `**Memory Usage:**\n` +
        `├─ **Heap Used:** ${heapUsed} MB\n` +
        `├─ **Heap Total:** ${heapTotal} MB\n` +
        `├─ **RSS:** ${rss} MB\n` +
        `├─ **System Total:** ${(systemMem / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
        `└─ **System Used:** ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(memoryInfo)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const systemInfo =
        `**System Information:**\n` +
        `├─ **OS:** ${os.type()} ${os.release()}\n` +
        `├─ **Hostname:** ${os.hostname()}\n` +
        `├─ **CPU:** ${cpuModel}\n` +
        `└─ **CPU Cores:** ${cpuCores}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(systemInfo)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const botInfo =
        `**Bot Information:**\n` +
        `├─ **Guilds:** ${client.guilds.cache.size}\n` +
        `├─ **Users:** ${client.users.cache.size}\n` +
        `├─ **Channels:** ${client.channels.cache.size}\n` +
        `└─ **Commands:** ${client.commands?.size || 0}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(botInfo)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("NodeCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred.`,
      });
    }
  }

  _formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(" ") || "0s";
  }
}

export default new NodeCommand();
