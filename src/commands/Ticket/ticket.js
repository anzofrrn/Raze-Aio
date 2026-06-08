import {
  EmbedBuilder,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import { config } from "#config/config";
import emoji from "#config/emoji";

export default {
  name: "ticket",
  description: "View ticket system information and commands",
  usage: "ticket",
  aliases: ["tickets", "ticketinfo"],
  category: "Ticket",
  cooldown: 3,

  async execute({ client, message, args, prefix }) {
    const stats = db.getTicketStats(message.guild.id);
    const panels = db.getAllTicketPanels(message.guild.id);

    let content = `**Professional Ticket System**\n\n`;
    content += `**${emoji.get("info")} Statistics**\n`;
    content += `├─ Total Tickets: ${stats.total}\n`;
    content += `├─ Open Tickets: ${stats.open}\n`;
    content += `├─ Closed Tickets: ${stats.closed}\n`;
    content += `├─ Active Panels: ${panels.length}\n`;
    content += `└─ Avg Rating: ${stats.avgRating}\n\n`;

    content += `**${emoji.get("ticketPanel")} Panel Management**\n`;
    content += `├─ \`${prefix}panelsetup\` - Create a new ticket panel\n`;
    content += `└─ \`${prefix}panelsend <id>\` - Send/resend a panel\n\n`;

    content += `**${emoji.get("ticket")} Ticket Commands**\n`;
    content += `├─ \`${prefix}claim\` - Claim a ticket\n`;
    content += `├─ \`${prefix}close [reason]\` - Close the ticket\n`;
    content += `├─ \`${prefix}rename <name>\` - Rename the ticket\n`;
    content += `├─ \`${prefix}add <user>\` - Add user to ticket\n`;
    content += `├─ \`${prefix}remove <user>\` - Remove user from ticket\n`;
    content += `└─ \`${prefix}transcript\` - Generate transcript\n\n`;

    content += `**${emoji.get("ticketStar")} Features**\n`;
    content += `├─ Multiple Panels Support\n`;
    content += `├─ Category-based Tickets\n`;
    content += `├─ Review System (1-5 stars)\n`;
    content += `├─ Auto Transcripts\n`;
    content += `└─ Dropdown or Button Mode`;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${emoji.get("ticket")} Ticket System`)
      .setDescription(content)
      .setFooter({ text: `Use ${prefix}panelsetup to get started!` });

    return message.reply({ embeds: [embed] });
  },
};
