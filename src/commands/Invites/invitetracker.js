import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import emoji from "#config/emoji";

class InviteTrackerCommand extends Command {
  constructor() {
    super({
      name: "invitetracker",
      description: "Shows invite tracking status (always enabled)",
      usage: "invitetracker",
      aliases: ["invitetracking", "trackinvites"],
      category: "Invites",
      examples: [
        "invitetracker",
      ],
      cooldown: 5,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enabledSlash: true,
      slashData: {
        name: "invitetracker",
        description: "Shows invite tracking status",
        options: [],
      },
    });
  }

  async execute({ client, message, args }) {
    const response = await this._showStatus(message.guild);
    return message.reply(response);
  }

  async slashExecute({ client, interaction }) {
    const response = await this._showStatus(interaction.guild);
    return interaction.reply(response);
  }

  async _showStatus(guild) {
    db.setInviteTracking(guild.id, true);

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("check")} **Invite Tracking Status**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const message = 
      `${emoji.get("enabled")} Invite tracking is **always enabled**\n\n` +
      `**What this does:**\n` +
      `├─ Tracks who invited each member\n` +
      `├─ Counts total, fake, and left invites\n` +
      `└─ Enables invite rank rewards\n\n` +
      `*Use \`invites\` to check invite counts*`;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(message)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    };
  }
}

export default new InviteTrackerCommand();
