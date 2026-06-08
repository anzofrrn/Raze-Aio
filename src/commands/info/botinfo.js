import { Command } from "#structures/classes/Command";
import {
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        ContainerBuilder,
        MessageFlags,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";
import { logger } from "#utils/logger";

class BotInfoCommand extends Command {
        constructor() {
                super({
                        name: "botinfo",
                        description: "Shows detailed information about the bot.",
                        usage: "botinfo",
                        aliases: ["bot", "info", "about", "stats"],
                        category: "info",
                        examples: ["botinfo", "bot"],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: "botinfo",
                                description: "Get detailed information about the bot.",
                        },
                });
        }

        async execute({ client, message }) {
                try {
                        const messageInstance = await message.reply({
                                components: [this._createBotInfoContainer(client, message.guild)],
                                flags: MessageFlags.IsComponentsV2,
                        });

                        this._setupCollector(messageInstance, message.author.id, client, message.guild);
                } catch (error) {
                        logger.error("BotInfoCommand", `Error in prefix command: ${error.message}`, error);
                        await message.reply({
                                components: [this._createErrorContainer("An error occurred while loading bot information.")],
                                flags: MessageFlags.IsComponentsV2,
                        }).catch(() => {});
                }
        }

        async slashExecute({ client, interaction }) {
                try {
                        const messageInstance = await interaction.reply({
                                components: [this._createBotInfoContainer(client, interaction.guild)],
                                flags: MessageFlags.IsComponentsV2,
                                fetchReply: true,
                        });

                        this._setupCollector(messageInstance, interaction.user.id, client, interaction.guild);
                } catch (error) {
                        logger.error("BotInfoCommand", `Error in slash command: ${error.message}`, error);
                        const errorPayload = {
                                components: [this._createErrorContainer("An error occurred while loading bot information.")],
                                ephemeral: true,
                        };
                        if (interaction.replied || interaction.deferred) {
                                await interaction.editReply(errorPayload).catch(() => {});
                        } else {
                                await interaction.reply(errorPayload).catch(() => {});
                        }
                }
        }

        _createBotInfoContainer(client, guild = null) {
                const container = new ContainerBuilder();

                // Per-server branding
                const branding = guild ? db.getBranding(guild.id) : {};
                const botNick = branding.nick || client.user.username;
                const botBio = branding.bio || null;
                const botAvatar = branding.avatar || client.user.displayAvatarURL({ dynamic: true, size: 256 });

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${emoji.get("info")} ${botNick}**`)
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                const uptime = this._formatUptime(client.uptime);
                const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

                let infoContent = ``;
                if (botBio) infoContent += `> *${botBio}*\n\n`;

                infoContent += `**General**\n` +
                        `- **Name:** ${botNick}\n` +
                        `- **Developer:** Void & CodeZ\n` +
                        `- **Library:** Discord.js\n` +
                        `- **Type:** Multipurpose Bot\n\n` +
                        `**Statistics**\n` +
                        `- **Uptime:** ${uptime}\n` +
                        `- **Guilds:** ${client.guilds.cache.size}\n` +
                        `- **Users:** ${client.users.cache.size}\n` +
                        `- **Commands:** ${client.commands?.size || 0}\n` +
                        `- **Memory:** ${memoryUsage} MB`;

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(infoContent));

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                // Show avatar image
                try {
                        container.addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems(
                                        new MediaGalleryItemBuilder().setURL(botAvatar)
                                )
                        );
                        container.addSeparatorComponents(
                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                        );
                } catch (_) {}

                const buttonRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setCustomId('botinfo_team')
                                .setLabel('Team Info')
                                .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                                .setLabel('Support')
                                .setStyle(ButtonStyle.Link)
                                .setURL(config.links?.supportServer || 'https://discord.gg/raze')
                );

                container.addActionRowComponents(buttonRow);

                return container;
        }

        _createTeamInfoContainer() {
                const container = new ContainerBuilder();

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.get('folder')} **Development Team**`)
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                const content = `**Meet the development team!**\n\n` +
                        `**Lead Developer:** Void\n` +
                        `**Design & Dev:** CodeZ\n` +
                        `**Bot Name:** Raze\n` +
                        `**Specialization:** Multipurpose Discord Bot\n` +
                        `**Status:** Active Development\n\n` +
                        `*We\'re constantly working to improve your experience!*`;

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                const buttonRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setCustomId('botinfo_back')
                                .setLabel('Bot Info')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji(emoji.get("info")),
                        new ButtonBuilder()
                                .setLabel('GitHub')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://github.com/dibyanshu/errorx')
                );

                container.addActionRowComponents(buttonRow);

                return container;
        }

        _createErrorContainer(message) {
                const container = new ContainerBuilder();

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.get('cross')} **Error**`)
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(message));

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                return container;
        }

        _formatUptime(ms) {
                const seconds = Math.floor((ms / 1000) % 60);
                const minutes = Math.floor((ms / (1000 * 60)) % 60);
                const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
                const days = Math.floor(ms / (1000 * 60 * 60 * 24));

                if (days > 0) return `${days}d ${hours}h ${minutes}m`;
                if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                if (minutes > 0) return `${minutes}m ${seconds}s`;
                return `${seconds}s`;
        }

        _setupCollector(message, userId, client, guild = null) {
                const collector = message.createMessageComponentCollector({
                        filter: (i) => i.user.id === userId,
                        time: 300_000
                });

                collector.on('collect', async (interaction) => {
                        try {
                                if (interaction.customId === 'botinfo_team') {
                                        await interaction.update({
                                                components: [this._createTeamInfoContainer()],
                                                flags: MessageFlags.IsComponentsV2,
                                        });
                                } else if (interaction.customId === 'botinfo_back') {
                                        await interaction.update({
                                                components: [this._createBotInfoContainer(client, interaction.guild)],
                                                flags: MessageFlags.IsComponentsV2,
                                        });
                                }
                        } catch (error) {
                                logger.error("BotInfoCommand", `Error in collector: ${error.message}`, error);
                        }
                });

                collector.on('end', async () => {
                        try {
                                const fetchedMessage = await message.fetch().catch(() => null);
                                if (fetchedMessage?.components.length > 0) {
                                        await fetchedMessage.edit({
                                                components: [this._createExpiredContainer()]
                                        });
                                }
                        } catch (error) {
                                if (error.code !== 10008) {
                                        logger.error("BotInfoCommand", `Error updating expired components: ${error.message}`, error);
                                }
                        }
                });
        }

        _createExpiredContainer() {
                const container = new ContainerBuilder();

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.get('info')} **Bot Information**`)
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                const content = `**This interaction has expired**\n\n` +
                        `Run the command again to view bot information \n\n` +
                        `*Commands: \`botinfo\`, \`bot\`, \`info\`, \`about\`, \`stats\`*`;

                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                return container;
        }
}

export default new BotInfoCommand();
