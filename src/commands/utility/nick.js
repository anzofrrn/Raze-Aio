import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import emoji from "#config/emoji";

class NickCommand extends Command {
  constructor() {
    super({
      name: "nick",
      description: "Change your or someone else's nickname",
      usage: "nick [new nickname] | nick @user [new nickname]",
      aliases: ["nickname", "setnick"],
      category: "utility",
      examples: ["nick CoolName", "nick @user NewName"],
      cooldown: 5,
      userPermissions: [PermissionFlagsBits.ChangeNickname],
      enabledSlash: true,
      slashData: {
        name: "nick",
        description: "Change your or someone else's nickname",
        options: [
          { name: "nickname", description: "The new nickname (use 'reset' to clear)", type: 3, required: true },
          { name: "user", description: "The user to change nickname for (requires Manage Nicknames)", type: 6, required: false },
        ],
      },
    });
  }

  async execute({ client, message, args }) {
    try {
      if (!args[0]) {
        return message.reply({
          content: `${emoji.get("cross")} Please provide a nickname!\n**Usage:** \`${this.usage}\``,
        });
      }

      let target = message.member;
      let newNick = args.join(" ");

      if (message.mentions.members.first()) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
          return message.reply({
            content: `${emoji.get("cross")} You need the \`Manage Nicknames\` permission to change others' nicknames!`,
          });
        }
        target = message.mentions.members.first();
        newNick = args.slice(1).join(" ");
      }

      if (!newNick) {
        return message.reply({
          content: `${emoji.get("cross")} Please provide a new nickname!`,
        });
      }

      if (newNick.length > 32) {
        return message.reply({
          content: `${emoji.get("cross")} Nickname must be 32 characters or less!`,
        });
      }

      if (newNick.toLowerCase() === "reset" || newNick.toLowerCase() === "clear") {
        newNick = null;
      }

      const oldNick = target.displayName;

      try {
        await target.setNickname(newNick);

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji.get("check")} **Nickname Updated**`
          )
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        const content = newNick 
          ? `**${target.user.username}**'s nickname has been changed.\n\n` +
            `├─ **Old:** ${oldNick}\n` +
            `└─ **New:** ${newNick}`
          : `**${target.user.username}**'s nickname has been reset to their username.`;

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (err) {
        return message.reply({
          content: `${emoji.get("cross")} I cannot change this user's nickname. They may have higher permissions than me.`,
        });
      }
    } catch (error) {
      client.logger?.error("NickCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while changing the nickname.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      let target = interaction.member;
      let newNick = interaction.options.getString("nickname");
      const targetUser = interaction.options.getMember("user");

      if (targetUser) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
          return interaction.reply({ content: `${emoji.get("cross")} You need \`Manage Nicknames\` permission!`, ephemeral: true });
        }
        target = targetUser;
      }

      if (newNick.length > 32) return interaction.reply({ content: `${emoji.get("cross")} Nickname must be 32 characters or less!`, ephemeral: true });
      if (newNick.toLowerCase() === "reset" || newNick.toLowerCase() === "clear") newNick = null;

      const oldNick = target.displayName;

      try {
        await target.setNickname(newNick);
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("check")} **Nickname Updated**`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        const content = newNick ? `**${target.user.username}**'s nickname has been changed.\n\n├─ **Old:** ${oldNick}\n└─ **New:** ${newNick}` : `**${target.user.username}**'s nickname has been reset.`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        return interaction.reply({ content: `${emoji.get("cross")} I cannot change this user's nickname.`, ephemeral: true });
      }
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred.`, ephemeral: true });
    }
  }
}

export default new NickCommand();
