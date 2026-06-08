import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";
import { db } from "#database/DatabaseManager";

class AfkCommand extends Command {
  constructor() {
    super({
      name: "afk",
      description: "Set your AFK status with an optional reason",
      usage: "afk [reason]",
      aliases: ["away", "brb"],
      category: "utility",
      examples: ["afk", "afk Going to sleep"],
      cooldown: 10,
      enabledSlash: true,
      slashData: {
        name: "afk",
        description: "Set your AFK status with an optional reason",
        options: [{ name: "reason", description: "Reason for being AFK", type: 3, required: false }],
      },
    });
  }

  async execute({ client, message, args }) {
    try {
      const reason = args.join(" ") || "AFK";

      try {
        db.user.setAfk(message.author.id, message.guild.id, reason);
      } catch (dbError) {
        client.logger?.warn("AfkCommand", `Database not available, using in-memory storage`);
        if (!client.afkUsers) client.afkUsers = new Map();
        client.afkUsers.set(`${message.guild.id}-${message.author.id}`, {
          reason,
          timestamp: Date.now(),
        });
      }

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("afk")} **AFK Status Set**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${message.author.username}** is now AFK.\n\n` +
            `**Reason:** ${reason}\n\n` +
            `*You will be marked as back when you send a message.*`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            message.author.displayAvatarURL({ dynamic: true })
          )
        );

      container.addSectionComponents(section);

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      try {
        const currentNick = message.member.displayName;
        if (!currentNick.startsWith("[AFK] ")) {
          await message.member.setNickname(`[AFK] ${currentNick.slice(0, 26)}`).catch(() => {});
        }
      } catch (e) {
      }
    } catch (error) {
      client.logger?.error("AfkCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while setting AFK status.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const reason = interaction.options.getString("reason") || "AFK";

      try {
        db.user.setAfk(interaction.user.id, interaction.guild.id, reason);
      } catch (dbError) {
        if (!client.afkUsers) client.afkUsers = new Map();
        client.afkUsers.set(`${interaction.guild.id}-${interaction.user.id}`, { reason, timestamp: Date.now() });
      }

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("afk")} **AFK Status Set**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const section = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${interaction.user.username}** is now AFK.\n\n**Reason:** ${reason}\n\n*You will be marked as back when you send a message.*`)).setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ dynamic: true })));
      container.addSectionComponents(section);

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

      try {
        const currentNick = interaction.member.displayName;
        if (!currentNick.startsWith("[AFK] ")) {
          await interaction.member.setNickname(`[AFK] ${currentNick.slice(0, 26)}`).catch(() => {});
        }
      } catch (e) {}
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred.`, ephemeral: true });
    }
  }
}

export default new AfkCommand();
