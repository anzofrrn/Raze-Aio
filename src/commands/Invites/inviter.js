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

class InviterCommand extends Command {
  constructor() {
    super({
      name: "inviter",
      description: "Shows who invited a user",
      usage: "inviter [@member]",
      aliases: ["whoinvited", "invitedby"],
      category: "Invites",
      examples: [
        "inviter",
        "inviter @user",
      ],
      cooldown: 5,
      permissions: [PermissionFlagsBits.EmbedLinks],
      enabledSlash: true,
      slashData: {
        name: "inviter",
        description: "Shows who invited a user",
        options: [
          {
            name: "user",
            description: "The user to check",
            type: 6,
            required: false,
          },
        ],
      },
    });
  }

  async execute({ client, message, args }) {
    const target = message.mentions.members.first() || message.member;
    const response = await this._getInviter(client, message.guild, target.user);
    return message.reply(response);
  }

  async slashExecute({ client, interaction }) {
    const user = interaction.options.getUser("user") || interaction.user;
    const response = await this._getInviter(client, interaction.guild, user);
    return interaction.reply(response);
  }

  async _getInviter(client, guild, user) {
    const trackingEnabled = db.isInviteTrackingEnabled(guild.id);
    
    if (!trackingEnabled) {
      return this._createErrorContainer("Invite tracking is disabled in this server.");
    }

    const inviteData = db.getMemberInvites(guild.id, user.id);

    if (!inviteData.inviter_id) {
      return this._createErrorContainer(`Cannot track how \`${user.username}\` joined the server.`);
    }

    let inviter;
    try {
      inviter = await client.users.fetch(inviteData.inviter_id);
    } catch {
      inviter = null;
    }

    const inviterData = db.getMemberInvites(guild.id, inviteData.inviter_id);
    const inviterEffective = db.getEffectiveInvites(inviterData);

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("inviter")} **Invite Data for ${user.username}**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const content =
      `${emoji.get("user")} **Inviter:** ${inviter ? inviter.username : "Deleted User"}\n` +
      `${emoji.get("info")} **Inviter ID:** \`${inviteData.inviter_id}\`\n` +
      `${emoji.get("inviteCode")} **Invite Code:** \`${inviteData.invite_code || "Unknown"}\`\n` +
      `${emoji.get("invites")} **Inviter's Invites:** ${inviterEffective}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  _createErrorContainer(message) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("cross")} **Error**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(message)
    );

    return {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    };
  }
}

export default new InviterCommand();
