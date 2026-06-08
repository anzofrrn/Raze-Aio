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

class ResetInvitesCommand extends Command {
  constructor() {
    super({
      name: "resetinvites",
      description: "Reset a user's added invites",
      usage: "resetinvites <@member>",
      aliases: ["clearinvites", "removeinvites"],
      category: "Invites",
      examples: [
        "resetinvites @user",
      ],
      cooldown: 5,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      permissions: [PermissionFlagsBits.EmbedLinks],
      enabledSlash: true,
      slashData: {
        name: "resetinvites",
        description: "Reset a user's added invites",
        options: [
          {
            name: "user",
            description: "The user to reset invites for",
            type: 6,
            required: true,
          },
        ],
      },
    });
  }

  async execute({ client, message, args }) {
    const target = message.mentions.members.first();

    if (!target) {
      return message.reply(this._createErrorContainer("Please mention a user to reset invites for."));
    }

    const response = await this._resetInvites(message.guild, target.user);
    return message.reply(response);
  }

  async slashExecute({ client, interaction }) {
    const user = interaction.options.getUser("user");
    const response = await this._resetInvites(interaction.guild, user);
    return interaction.reply(response);
  }

  async _resetInvites(guild, user) {
    db.resetMemberInvites(guild.id, user.id);
    const memberData = db.getMemberInvites(guild.id, user.id);
    const effectiveInvites = db.getEffectiveInvites(memberData);

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("check")} **Invites Reset**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const content =
      `Successfully reset bonus invites for ${user.toString()}\n\n` +
      `${emoji.get("invites")} **Current Invites:** ${effectiveInvites}`;

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

export default new ResetInvitesCommand();
