import { Command } from "#structures/classes/Command";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ComponentType,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  MentionableSelectMenuBuilder,
} from "discord.js";
import emoji from "#config/emoji";
import { config } from "#config/config";
import fs from "fs";
import path from "path";
import { logger } from "#utils/logger";

// Categories hidden from help menu entirely
const HIDDEN_CATEGORIES = ["developer", "Owner"];

// Which categories appear under "Main Modules"
const MAIN_MODULE_NAMES = ["moderation", "music", "giveaway", "fun", "invites", "ticket", "utility", "info"];

// Pull emoji string from emoji.js by category name
function catEmoji(name) {
  const key = `category_${name.toLowerCase()}`;
  return emoji.get(key) || emoji.get("folder");
}

// Extract emoji object for select menu options (needs { id, animated } or string)
function emojiObj(name) {
  const raw = emoji.get(name);
  if (!raw) return undefined;
  const animated = raw.startsWith("<a:");
  const match = raw.match(/:(\d+)>/);
  if (match) return { id: match[1], animated };
  return raw; // plain unicode fallback
}

function catEmojiObj(name) {
  return emojiObj(`category_${name.toLowerCase()}`) || emojiObj("folder");
}

class HelpCommand extends Command {
  constructor() {
    super({
      name: "help",
      description: "Shows all available commands and their information",
      usage: "help [command]",
      aliases: ["h", "commands"],
      category: "info",
      examples: ["help", "help play", "help music", "h skip"],
      cooldown: 3,
      enabledSlash: true,
      slashData: {
        name: "help",
        description: "Get help for commands",
        options: [
          {
            name: "command",
            description: "Specific command to get help for",
            type: 3,
            required: false,
            autocomplete: true,
          },
        ],
      },
    });
  }

  // ─── Directory scanner ────────────────────────────────────────────────────

  async _scanCommandDirectories() {
    try {
      const commandsPath  = path.join(process.cwd(), "src", "commands");
      const commands      = new Map();
      const categories    = new Map();
      const subcategories = new Map();

      if (!fs.existsSync(commandsPath)) return { commands, categories, subcategories };

      const hiddenLower = HIDDEN_CATEGORIES.map((c) => c.toLowerCase());

      const categoryDirs = fs
        .readdirSync(commandsPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((n) => !hiddenLower.includes(n.toLowerCase()));

      for (const categoryName of categoryDirs) {
        if (!categories.has(categoryName)) categories.set(categoryName, []);
        await this._scanCategoryDirectory(
          path.join(commandsPath, categoryName),
          categoryName,
          commands,
          categories,
          subcategories,
        );
      }

      return { commands, categories, subcategories };
    } catch (error) {
      logger.error("HelpCommand", "Error scanning command directories:", error);
      return { commands: new Map(), categories: new Map(), subcategories: new Map() };
    }
  }

  async _scanCategoryDirectory(categoryPath, categoryName, commands, categories, subcategories) {
    try {
      const items = fs.readdirSync(categoryPath, { withFileTypes: true });

      for (const file of items.filter((i) => i.isFile() && i.name.endsWith(".js"))) {
        await this._loadCommand(path.join(categoryPath, file.name), categoryName, commands, categories);
      }

      const subdirs = items.filter((i) => i.isDirectory()).map((i) => i.name);
      if (subdirs.length > 0) {
        if (!subcategories.has(categoryName)) subcategories.set(categoryName, new Map());
        const catSubcats = subcategories.get(categoryName);

        for (const subdir of subdirs) {
          const subcatCmds = [];
          for (const file of fs
            .readdirSync(path.join(categoryPath, subdir), { withFileTypes: true })
            .filter((i) => i.isFile() && i.name.endsWith(".js"))) {
            const cmd = await this._loadCommand(
              path.join(categoryPath, subdir, file.name),
              categoryName,
              commands,
              categories,
            );
            if (cmd) subcatCmds.push(cmd);
          }
          if (subcatCmds.length > 0) catSubcats.set(subdir, subcatCmds);
        }
      }
    } catch (error) {
      logger.error("HelpCommand", `Error scanning category ${categoryName}:`, error);
    }
  }

  async _loadCommand(filePath, categoryName, commands, categories) {
    try {
      const { default: CommandClass } = await import(filePath);
      if (!CommandClass || typeof CommandClass !== "object") return null;

      const command = { ...CommandClass, category: categoryName };
      commands.set(command.name, command);
      if (command.aliases?.length) {
        for (const alias of command.aliases) commands.set(alias, command);
      }

      const catCmds = categories.get(categoryName);
      if (!catCmds.find((c) => c.name === command.name)) catCmds.push(command);

      return command;
    } catch (error) {
      logger.error("HelpCommand", `Error loading command from ${filePath}:`, error);
      return null;
    }
  }

  // ─── Execute ──────────────────────────────────────────────────────────────

  async execute({ client, message, args }) {
    try {
      const { commands, categories, subcategories } = await this._scanCommandDirectories();

      if (args.length > 0) {
        const command = commands.get(args[0].toLowerCase());
        if (command) {
          return this._sendCommandHelp(message, command, "message", client, commands, categories, subcategories);
        }
        return message.reply({
          components: [this._createErrorContainer(`Command "${args[0]}" not found.`)],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const helpMessage = await message.reply({
        components: [this._createMainContainer(commands, categories, subcategories, message.guild, client)],
        flags: MessageFlags.IsComponentsV2,
      });

      this._setupCollector(helpMessage, message.author.id, client, commands, categories, subcategories);
    } catch (error) {
      logger.error("HelpCommand", `Error in prefix execute: ${error.message}`, error);
      await message.reply({
        components: [this._createErrorContainer("An error occurred while loading help.")],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const { commands, categories, subcategories } = await this._scanCommandDirectories();
      const commandName = interaction.options.getString("command");

      if (commandName) {
        const command = commands.get(commandName.toLowerCase());
        if (command) {
          return this._sendCommandHelp(interaction, command, "interaction", client, commands, categories, subcategories);
        }
        return interaction.reply({
          components: [this._createErrorContainer(`Command "${commandName}" not found.`)],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true,
        });
      }

      const helpMessage = await interaction.reply({
        components: [this._createMainContainer(commands, categories, subcategories, interaction.guild, client)],
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true,
      });

      this._setupCollector(helpMessage, interaction.user.id, client, commands, categories, subcategories);
    } catch (error) {
      logger.error("HelpCommand", `Error in slash execute: ${error.message}`, error);
      try {
        const payload = { components: [this._createErrorContainer("An error occurred while loading help.")] };
        if (interaction.replied || interaction.deferred) await interaction.editReply(payload);
        else await interaction.reply({ ...payload, ephemeral: true });
      } catch (e) {
        logger.error("HelpCommand", "Failed to send error response:", e);
      }
    }
  }

  async autocomplete({ interaction }) {
    try {
      const { commands } = await this._scanCommandDirectories();
      const focused      = interaction.options.getFocused();
      const unique       = new Set();
      for (const [name, cmd] of commands) {
        if (cmd.name === name) unique.add(name);
      }
      await interaction.respond(
        Array.from(unique)
          .filter((n) => n.toLowerCase().includes(focused.toLowerCase()))
          .slice(0, 25)
          .map((n) => ({ name: n, value: n })),
      );
    } catch {
      await interaction.respond([]).catch(() => {});
    }
  }

  // ─── Main panel ───────────────────────────────────────────────────────────

  _createMainContainer(commands, categories, subcategories, guild, client) {
    try {
      const categoryArray  = Array.from(categories.keys());
      const totalCommands  = Array.from(commands.values()).filter(
        (cmd, i, arr) => arr.findIndex((c) => c.name === cmd.name) === i,
      ).length;

      const guildCount  = client?.guilds?.cache?.size ?? "?";
      const memberCount = guild?.memberCount ?? "?";

      const mainCats  = categoryArray.filter((c) => MAIN_MODULE_NAMES.includes(c.toLowerCase()));
      const extraCats = categoryArray.filter((c) => !MAIN_MODULE_NAMES.includes(c.toLowerCase()));

      const supportUrl = config.links?.supportServer || "https://discord.gg/raze";
      const inviteUrl  = config.links?.invite        || supportUrl;

      const container = new ContainerBuilder();

      // ── Header ──────────────────────────────────────────────────────────
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("raze")} **Help Panel**`,
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      // ── Stats block ─────────────────────────────────────────────────────
      let stats = "";
      stats += `${emoji.get("list")} **Total Commands: ${totalCommands}**\n`;
      stats += `${emoji.get("server")} Serving **${guildCount} servers** with **${memberCount} members**\n`;
      stats += `${emoji.get("user")} **Developer:** Void | CodeZ Dev\n`;
      stats += `${emoji.get("link")} [Invite](${inviteUrl}) | [Support Server](${supportUrl})`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(stats),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      // ── Main Modules ────────────────────────────────────────────────────
      if (mainCats.length > 0) {
        let mainContent = `${emoji.get("openfolder")} __**Main Modules**__\n`;
        for (const cat of mainCats) {
          mainContent += `${emoji.get("reply3")} ${catEmoji(cat)} ${this._capitalize(cat)}\n`;
        }
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(mainContent.trimEnd()),
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        );
      }

      // ── Extra Modules ───────────────────────────────────────────────────
      if (extraCats.length > 0) {
        let extraContent = `${emoji.get("folder")} __**Extra Modules**__\n`;
        for (const cat of extraCats) {
          extraContent += `${emoji.get("reply3")} ${catEmoji(cat)} ${this._capitalize(cat)}\n`;
        }
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(extraContent.trimEnd()),
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        );
      }

      // ── Banner ──────────────────────────────────────────────────────────
      if (config.assets?.bannerUrl) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(config.assets.bannerUrl),
          ),
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        );
      }

      if (categoryArray.length === 0) return this._createErrorContainer("No command categories available.");

      // ── Category select ─────────────────────────────────────────────────
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_category_select")
        .setPlaceholder("Select a category")
        .addOptions(
          categoryArray.map((cat) => ({
            label: this._capitalize(cat),
            value: cat,
            description: `View ${this._capitalize(cat)} commands`,
            emoji: catEmojiObj(cat),
          })),
        );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
      );

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating main container:", error);
      return this._createErrorContainer("Unable to load help menu.");
    }
  }

  // ─── Category page ────────────────────────────────────────────────────────

  _createCategoryContainer(category, categories, subcategories) {
    try {
      const cmds    = categories.get(category) || [];
      const subcats = subcategories.get(category);

      if (cmds.length === 0 && (!subcats || subcats.size === 0)) {
        return this._createErrorContainer(`No commands found in category "${category}".`);
      }

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${catEmoji(category)} **${this._capitalize(category)} Commands**`,
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      // Direct commands (not in a subcat)
      const directCmds = cmds.filter((cmd) => {
        if (!subcats) return true;
        for (const [, subcatCmds] of subcats) {
          if (subcatCmds.find((sc) => sc.name === cmd.name)) return false;
        }
        return true;
      });

      let content = "";
      directCmds.forEach((cmd) => {
        content += `${emoji.get("reply3")} ${emoji.get("info")} \`${cmd.name}\`\n`;
      });

      if (subcats && subcats.size > 0) {
        for (const [subcatName] of subcats) {
          content += `${emoji.get("reply3")} ${catEmoji(subcatName)} **${this._capitalize(subcatName)}**\n`;
        }
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content.trimEnd() || "No commands found."),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      // Select menu
      const selectOptions = [];

      directCmds.slice(0, 25).forEach((cmd) => {
        selectOptions.push({
          label: cmd.name,
          value: `cmd_${cmd.name}`,
          description: cmd.description ? cmd.description.slice(0, 100) : "No description",
          emoji: emojiObj("info"),
        });
      });

      if (subcats) {
        for (const [subcatName] of subcats) {
          if (selectOptions.length < 25) {
            selectOptions.push({
              label: this._capitalize(subcatName),
              value: `subcat_${subcatName}`,
              description: `View ${this._capitalize(subcatName)} commands`,
              emoji: catEmojiObj(subcatName),
            });
          }
        }
      }

      if (selectOptions.length > 0) {
        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`help_category_nav_${category}`)
              .setPlaceholder("Select a command or folder")
              .addOptions(selectOptions.slice(0, 25)),
          ),
        );
      }

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("help_back_main")
            .setLabel("Back")
            .setEmoji(emojiObj("left"))
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("help_close")
            .setLabel("Close")
            .setEmoji(emojiObj("cross"))
            .setStyle(ButtonStyle.Danger),
        ),
      );

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating category container:", error);
      return this._createErrorContainer("Unable to load category commands.");
    }
  }

  // ─── Subcategory page ─────────────────────────────────────────────────────

  _createSubcategoryContainer(category, subcatName, subcategories) {
    try {
      const subcats = subcategories.get(category);
      if (!subcats?.has(subcatName)) return this._createErrorContainer(`Subcategory "${subcatName}" not found.`);

      const subcatCmds = subcats.get(subcatName) || [];
      const container  = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${catEmoji(subcatName)} **${this._capitalize(category)} › ${this._capitalize(subcatName)}**`,
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = "";
      subcatCmds.forEach((cmd) => {
        content += `${emoji.get("reply3")} ${emoji.get("info")} \`${cmd.name}\`\n`;
      });

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content.trimEnd() || "No commands found."),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      if (subcatCmds.length > 0) {
        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`help_subcat_cmd_${category}_${subcatName}`)
              .setPlaceholder("Select a command for detailed info")
              .addOptions(
                subcatCmds.slice(0, 25).map((cmd) => ({
                  label: cmd.name,
                  value: cmd.name,
                  description: cmd.description ? cmd.description.slice(0, 100) : "No description",
                  emoji: emojiObj("info"),
                })),
              ),
          ),
        );
      }

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help_back_category_${category}`)
            .setLabel("Back")
            .setEmoji(emojiObj("left"))
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("help_back_main")
            .setLabel("Home")
            .setEmoji(emojiObj("folder"))
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("help_close")
            .setLabel("Close")
            .setEmoji(emojiObj("cross"))
            .setStyle(ButtonStyle.Danger),
        ),
      );

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating subcategory container:", error);
      return this._createErrorContainer("Unable to load subcategory commands.");
    }
  }

  // ─── Command detail page ──────────────────────────────────────────────────

  _createCommandContainer(command, category) {
    try {
      if (!command) return this._createErrorContainer("Command not found.");

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("info")} **Command: \`${command.name}\`**`,
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = `**Basic Info**\n`;
      content += `${emoji.get("reply3")} ${emoji.get("reason")} **Description:** ${command.description || "No description provided"}\n`;
      content += `${emoji.get("reply3")} ${emoji.get("edit")} **Usage:** \`${command.usage || command.name}\`\n`;
      content += `${emoji.get("reply3")} ${emoji.get("folder")} **Category:** ${this._capitalize(command.category || "misc")}\n`;
      content += `${emoji.get("reply")} ${emoji.get("timer")} **Cooldown:** ${command.cooldown || 3}s\n`;

      if (command.aliases?.length) {
        content += `\n**Aliases:** ${command.aliases.map((a) => `\`${a}\``).join(", ")}\n`;
      }

      if (command.examples?.length) {
        content += `\n**Examples:**\n`;
        command.examples.forEach((ex) => {
          content += `${emoji.get("reply3")} \`${ex}\`\n`;
        });
      }

      const reqs = [];
      if (command.ownerOnly)         reqs.push(`${emoji.get("owner")} Bot Owner`);
      if (command.userPrem)          reqs.push(`${emoji.get("premium")} User Premium`);
      if (command.guildPrem)         reqs.push(`${emoji.get("premium")} Server Premium`);
      if (command.anyPrem)           reqs.push(`${emoji.get("premium")} Any Premium`);
      if (command.voiceRequired)     reqs.push(`${emoji.get("category_voice")} Voice Channel`);
      if (command.sameVoiceRequired) reqs.push(`${emoji.get("category_voice")} Same Voice Channel`);
      if (command.playerRequired)    reqs.push(`${emoji.get("music")} Music Player Active`);
      if (command.playingRequired)   reqs.push(`${emoji.get("play")} Currently Playing`);
      if (command.userPermissions?.length) reqs.push(`${emoji.get("role")} User Perms: ${command.userPermissions.join(", ")}`);
      if (command.permissions?.length)     reqs.push(`${emoji.get("role")} Bot Perms: ${command.permissions.join(", ")}`);

      if (reqs.length) {
        content += `\n**Requirements:**\n`;
        reqs.forEach((r) => { content += `${emoji.get("reply3")} ${r}\n`; });
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content.trimEnd()),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      const buttons = [
        new ButtonBuilder()
          .setCustomId(`help_back_category_${category || command.category || "misc"}`)
          .setLabel("Back")
          .setEmoji(emojiObj("left"))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("help_back_main")
          .setLabel("Home")
          .setEmoji(emojiObj("folder"))
          .setStyle(ButtonStyle.Primary),
      ];

      if (command.enabledSlash && command.slashData) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`help_slash_info_${command.name}`)
            .setLabel("Slash Info")
            .setEmoji(emojiObj("info"))
            .setStyle(ButtonStyle.Success),
        );
      }

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(buttons),
      );

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating command container:", error);
      return this._createErrorContainer("Unable to load command information.");
    }
  }

  // ─── Slash info page ──────────────────────────────────────────────────────

  _createSlashInfoContainer(command, category) {
    try {
      if (!command?.slashData) return this._createErrorContainer("Slash command information not available.");

      const container = new ContainerBuilder();
      const slashName = Array.isArray(command.slashData.name)
        ? `/${command.slashData.name.join(" ")}`
        : `/${command.slashData.name}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("info")} **Slash Command: \`${slashName}\`**`,
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = `${emoji.get("reply3")} **Description:** ${command.slashData.description}\n`;

      if (command.slashData.options?.length) {
        content += `\n**Options:**\n`;
        command.slashData.options.forEach((opt) => {
          content += `${emoji.get("reply3")} \`${opt.name}\` ${opt.required ? "(Required)" : "(Optional)"} — ${opt.description}\n`;
          opt.choices?.forEach((ch) => {
            content += `   ${emoji.get("reply")} \`${ch.name}\`\n`;
          });
        });
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content.trimEnd()),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help_back_command_${command.name}_${category || command.category || "misc"}`)
            .setLabel("Back")
            .setEmoji(emojiObj("left"))
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("help_back_main")
            .setLabel("Home")
            .setEmoji(emojiObj("folder"))
            .setStyle(ButtonStyle.Primary),
        ),
      );

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating slash info container:", error);
      return this._createErrorContainer("Unable to load slash command information.");
    }
  }

  // ─── Error container ──────────────────────────────────────────────────────

  _createErrorContainer(msg) {
    try {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emoji.get("cross")} **Error**`),
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji.get("warn")} ${msg}\n\n*Check your input and try again, or contact support.*`,
        ),
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
      return container;
    } catch {
      const fb = new ContainerBuilder();
      fb.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`❌ **Error** — Help system unavailable`),
      );
      return fb;
    }
  }

  // ─── Send command help ────────────────────────────────────────────────────

  async _sendCommandHelp(ctx, command, type, client, commands, categories, subcategories) {
    try {
      const container = this._createCommandContainer(command, command.category);
      const userId    = type === "message" ? ctx.author.id : ctx.user.id;
      const helpMessage = type === "message"
        ? await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 })
        : await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
      this._setupCollector(helpMessage, userId, client, commands, categories, subcategories);
    } catch (error) {
      logger.error("HelpCommand", "Error sending command help:", error);
    }
  }

  // ─── Collector ───────────────────────────────────────────────────────────

  _setupCollector(message, userId, client, commands, categories, subcategories) {
    try {
      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === userId,
        time: 300_000,
      });

      collector.on("collect", async (interaction) => {
        try {
          await interaction.deferUpdate();
          const id = interaction.customId;

          if (id === "help_close") {
            await interaction.deleteReply().catch(() => {});
            collector.stop();
            return;
          }

          if (id === "help_back_main") {
            await interaction.editReply({
              components: [this._createMainContainer(commands, categories, subcategories, interaction.guild, client)],
            });
            return;
          }

          if (id === "help_category_select") {
            await interaction.editReply({
              components: [this._createCategoryContainer(interaction.values[0], categories, subcategories)],
            });
            return;
          }

          if (id.startsWith("help_category_nav_")) {
            const category = id.replace("help_category_nav_", "");
            const val      = interaction.values[0];
            if (val.startsWith("cmd_")) {
              const cmd = commands.get(val.replace("cmd_", ""));
              if (cmd) await interaction.editReply({ components: [this._createCommandContainer(cmd, category)] });
            } else if (val.startsWith("subcat_")) {
              await interaction.editReply({
                components: [this._createSubcategoryContainer(category, val.replace("subcat_", ""), subcategories)],
              });
            }
            return;
          }

          if (id.startsWith("help_subcat_cmd_")) {
            const parts    = id.replace("help_subcat_cmd_", "").split("_");
            const category = parts[0];
            const cmd      = commands.get(interaction.values[0]);
            if (cmd) await interaction.editReply({ components: [this._createCommandContainer(cmd, category)] });
            return;
          }

          if (id.startsWith("help_back_category_")) {
            const category = id.replace("help_back_category_", "");
            await interaction.editReply({
              components: [this._createCategoryContainer(category, categories, subcategories)],
            });
            return;
          }

          if (id.startsWith("help_slash_info_")) {
            const cmd = commands.get(id.replace("help_slash_info_", ""));
            if (cmd) await interaction.editReply({ components: [this._createSlashInfoContainer(cmd, cmd.category)] });
            return;
          }

          if (id.startsWith("help_back_command_")) {
            const parts = id.replace("help_back_command_", "").split("_");
            const cmd   = commands.get(parts[0]);
            if (cmd) await interaction.editReply({ components: [this._createCommandContainer(cmd, parts[1])] });
            return;
          }
        } catch (error) {
          logger.error("HelpCommand", `Collector error: ${error.message}`, error);
          interaction.followUp({ content: "An error occurred. Please try again.", ephemeral: true }).catch(() => {});
        }
      });

      collector.on("end", async (_, reason) => {
        if (reason === "limit" || reason === "messageDelete") return;
        try {
          const msg = await this._fetchMessage(message).catch(() => null);
          if (msg?.components?.length) await this._disableAllComponents(msg, client);
        } catch (error) {
          this._handleDisableError(error, client, reason);
        }
      });
    } catch (error) {
      logger.error("HelpCommand", "Error setting up collector:", error);
    }
  }

  // ─── Component helpers ────────────────────────────────────────────────────

  async _disableAllComponents(message, client) {
    try {
      await message.edit({ components: this._processComponents(message.components), flags: MessageFlags.IsComponentsV2 });
      return true;
    } catch (error) {
      client?.logger?.error("HelpCommand", `Failed to disable components: ${error.message}`, error);
      return false;
    }
  }

  _processComponents(components) {
    return components.map((component) => {
      if (component.type === ComponentType.ActionRow) {
        return {
          ...component.toJSON(),
          components: component.components.map((sub) => ({ ...sub.toJSON(), disabled: true })),
        };
      }
      if (component.type === ComponentType.Container) {
        return { ...component.toJSON(), components: this._processComponents(component.components) };
      }
      if (component.type === ComponentType.Section) {
        const processed = { ...component.toJSON(), components: this._processComponents(component.components) };
        if (component.accessory?.type === ComponentType.Button) {
          processed.accessory = { ...component.accessory.toJSON(), disabled: true };
        }
        return processed;
      }
      return component.toJSON();
    });
  }

  _handleDisableError(error, client, reason) {
    if (error.code === 10008) client?.logger?.debug("HelpCommand", `Message deleted. Reason: ${reason}`);
    else if (error.code === 50001) client?.logger?.warn("HelpCommand", `Missing permissions. Reason: ${reason}`);
    else client?.logger?.error("HelpCommand", `Error disabling: ${error.message}. Reason: ${reason}`, error);
  }

  async _fetchMessage(msg) {
    if (msg.fetchReply) return msg.fetchReply();
    if (msg.fetch) return msg.fetch();
    return msg;
  }

  _capitalize(str) {
    if (!str || typeof str !== "string") return "Unknown";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default new HelpCommand();
