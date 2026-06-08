import { Command } from "#structures/classes/Command";
import { PermissionFlagsBits } from "discord.js";

class GiveawayEndCommand extends Command {
  constructor() {
    super({
      name: "gend",
      description: "End a giveaway immediately",
      usage: "gend <message_id>",
      aliases: ["giveaway-end", "giveawayend", "endgiveaway"],
      category: "giveaway",
      examples: ["gend 1234567890123456789"],
      cooldown: 5,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enabledSlash: true,
      slashData: {
        name: "gend",
        description: "End a giveaway immediately",
        options: [
          {
            name: "message_id",
            description: "The message ID of the giveaway to end",
            type: 3,
            required: true
          }
        ]
      }
    });
  }

  async execute({ client, message, args }) {
    if (!args[0]) {
      return message.channel.send("Please provide the message ID of the giveaway to end.");
    }

    const messageId = args[0];

    try {
      await client.giveawaysManager.end(messageId);
      return message.channel.send(`Giveaway with ID \`${messageId}\` has been ended successfully.`);
    } catch (error) {
      return message.channel.send(`Failed to end the giveaway. Make sure the message ID is correct and the giveaway exists.`);
    }
  }

  async slashExecute({ client, interaction }) {
    const messageId = interaction.options.getString("message_id");

    try {
      await client.giveawaysManager.end(messageId);
      return interaction.reply(`Giveaway with ID \`${messageId}\` has been ended successfully.`);
    } catch (error) {
      return interaction.reply(`Failed to end the giveaway. Make sure the message ID is correct and the giveaway exists.`);
    }
  }
}

export default new GiveawayEndCommand();
