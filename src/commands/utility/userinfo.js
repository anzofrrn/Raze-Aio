import { Command } from "#structures/classes/Command";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from "discord.js";
import emoji from "#config/emoji";

class UserInfoCommand extends Command {
  constructor() {
    super({
      name: "userinfo",
      description: "Display detailed information about a user",
      usage: "userinfo [@user]",
      aliases: ["ui", "whois", "user", "memberinfo"],
      category: "utility",
      examples: ["userinfo", "userinfo @user"],
      cooldown: 5,
      enabledSlash: true,
      slashData: {
        name: "userinfo",
        description: "Display detailed information about a user",
        options: [
          { name: "user", description: "The user to view information for", type: 6, required: false },
        ],
      },
    });
  }

  async execute({ client, message, args }) {
    try {
      const target = message.mentions.members.first() || 
                     (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null) ||
                     message.member;

      if (!target) {
        return message.reply({
          content: `${emoji.get("cross")} User not found in this server.`,
        });
      }

      const user = await target.user.fetch({ force: true });

      const statusEmojis = {
        online: "Online",
        idle: "Idle",
        dnd: "Do Not Disturb",
        offline: "Offline"
      };

      const keyPermissions = [
        "Administrator",
        "ManageGuild",
        "ManageRoles",
        "ManageChannels",
        "ManageMessages",
        "ManageWebhooks",
        "ManageNicknames",
        "ManageEmojisAndStickers",
        "KickMembers",
        "BanMembers",
        "MentionEveryone",
      ];

      const userPermissions = keyPermissions.filter(perm => 
        target.permissions.has(perm)
      );

      let acknowledgement = null;
      if (target.id === message.guild.ownerId) {
        acknowledgement = "Server Owner";
      } else if (target.permissions.has("Administrator")) {
        acknowledgement = "Server Administrator";
      } else if (target.permissions.has("ManageGuild")) {
        acknowledgement = "Server Manager";
      } else if (target.permissions.has("ModerateMembers")) {
        acknowledgement = "Server Moderator";
      }

      const roles = target.roles.cache
        .filter(r => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r)
        .slice(0, 10);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("user")} **User Information**`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const generalInfo = 
        `**General Information:**\n` +
        `├─ **Username:** ${user.username}\n` +
        `├─ **Display Name:** ${target.displayName}\n` +
        `├─ **ID:** \`${user.id}\`\n` +
        `├─ **Status:** ${statusEmojis[target.presence?.status || "offline"]}\n` +
        `├─ **Bot:** ${user.bot ? "Yes" : "No"}\n` +
        `└─ **Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

      const section1 = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(generalInfo)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            user.displayAvatarURL({ dynamic: true, size: 1024 })
          )
        );

      container.addSectionComponents(section1);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const serverInfo = 
        `**Server Information:**\n` +
        `├─ **Joined:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n` +
        `├─ **Highest Role:** ${target.roles.highest}\n` +
        `├─ **Hoist Role:** ${target.roles.hoist || "None"}\n` +
        `├─ **Color:** ${target.displayHexColor}\n` +
        `└─ **Roles [${target.roles.cache.size - 1}]:** ${roles.length > 0 ? roles.join(", ") : "None"}${roles.length < target.roles.cache.size - 1 ? ` +${target.roles.cache.size - 1 - roles.length} more` : ""}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(serverInfo)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );

      const permInfo = 
        `**Key Permissions:**\n` +
        `\`${userPermissions.length > 0 ? userPermissions.join(", ") : "None"}\`` +
        (acknowledgement ? `\n\n**Acknowledgement:** ${acknowledgement}` : "");

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(permInfo)
      );

      const bannerURL = user.bannerURL({ dynamic: true, size: 1024 });
      if (bannerURL) {
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
        
        const gallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder().setURL(bannerURL)
          );
        container.addMediaGalleryComponents(gallery);
      }

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      client.logger?.error("UserInfoCommand", `Error: ${error.message}`, error);
      await message.reply({
        content: `${emoji.get("cross")} An error occurred while fetching user info.`,
      });
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const target = interaction.options.getMember("user") || interaction.member;
      if (!target) return interaction.reply({ content: `${emoji.get("cross")} User not found.`, ephemeral: true });

      const user = await target.user.fetch({ force: true });
      const statusEmojis = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" };
      const keyPermissions = ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "ManageMessages", "KickMembers", "BanMembers"];
      const userPermissions = keyPermissions.filter(perm => target.permissions.has(perm));

      let acknowledgement = null;
      if (target.id === interaction.guild.ownerId) acknowledgement = "Server Owner";
      else if (target.permissions.has("Administrator")) acknowledgement = "Server Administrator";
      else if (target.permissions.has("ManageGuild")) acknowledgement = "Server Manager";
      else if (target.permissions.has("ModerateMembers")) acknowledgement = "Server Moderator";

      const roles = target.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position).map(r => r).slice(0, 10);

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.get("user")} **User Information**`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      const generalInfo = `**General Information:**\n├─ **Username:** ${user.username}\n├─ **Display Name:** ${target.displayName}\n├─ **ID:** \`${user.id}\`\n├─ **Status:** ${statusEmojis[target.presence?.status || "offline"]}\n├─ **Bot:** ${user.bot ? "Yes" : "No"}\n└─ **Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
      const section1 = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(generalInfo)).setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ dynamic: true, size: 1024 })));
      container.addSectionComponents(section1);

      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const serverInfo = `**Server Information:**\n├─ **Joined:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n├─ **Highest Role:** ${target.roles.highest}\n└─ **Roles [${target.roles.cache.size - 1}]:** ${roles.length > 0 ? roles.join(", ") : "None"}${roles.length < target.roles.cache.size - 1 ? ` +${target.roles.cache.size - 1 - roles.length} more` : ""}`;
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(serverInfo));

      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const permInfo = `**Key Permissions:**\n\`${userPermissions.length > 0 ? userPermissions.join(", ") : "None"}\`${acknowledgement ? `\n\n**Acknowledgement:** ${acknowledgement}` : ""}`;
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(permInfo));

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      await interaction.reply({ content: `${emoji.get("cross")} An error occurred while fetching user info.`, ephemeral: true });
    }
  }
}

export default new UserInfoCommand();
