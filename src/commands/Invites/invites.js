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

class InvitesCommand extends Command {
  constructor() {
    super({
      name: "invites",
      description: "Shows number of invites in this server",
      usage: "invites [@member]",
      aliases: ["inv", "myinvites"],
      category: "Invites",
      examples: [
        "invites",
        "invites @user",
      ],
      cooldown: 5,
      permissions: [PermissionFlagsBits.EmbedLinks],
      enabledSlash: true,
      slashData: {
        name: "invites",
        description: "Shows number of invites in this server",
        options: [
          {
            name: "user",
            description: "The user to get invites for",
            type: 6,
            required: false,
          },
        ],
      },
    });
  }

  async execute({ client, message, args }) {
    const target = message.mentions.members.first() || message.member;
    const response = await this._getInvites(message.guild, target.user);
    return message.reply(response);
  }

  async slashExecute({ client, interaction }) {
    const user = interaction.options.getUser("user") || interaction.user;
    const response = await this._getInvites(interaction.guild, user);
    return interaction.reply(response);
  }

  async _getInvites(guild, user) {
    db.setInviteTracking(guild.id, true);

    const inviteData = db.getMemberInvites(guild.id, user.id);
    const effectiveInvites = db.getEffectiveInvites(inviteData);

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji.get("invites")} **Invites for ${user.username}**`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const tracked = inviteData.tracked || 0;
    const added = inviteData.added || 0;
    const fake = inviteData.fake || 0;
    const left = inviteData.left_count || 0;

    const content =
      `${user.toString()} has **${effectiveInvites}** invites\n\n` +
      `${emoji.get("total")} **Total Invites:** ${tracked + added}\n` +
      `${emoji.get("fake")} **Fake Invites:** ${fake}\n` +
      `${emoji.get("leftInvite")} **Left Invites:** ${left}\n` +
      `${emoji.get("added")} **Bonus Invites:** ${added}`;

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

export default new InvitesCommand();
