import { REST } from '@discordjs/rest';
import { ClusterClient, getInfo } from 'discord-hybrid-sharding';
import {
        Client,
        GatewayIntentBits,
        Collection,
        Partials,
        Options,
} from 'discord.js';

import { config } from '#config/config';
import { db } from '#database/DatabaseManager';
import { CommandHandler } from '#handlers/CommandHandler';
import { EventLoader } from '#handlers/EventLoader';
import { MusicManager } from '#managers/MusicManager';
import { logger } from '#utils/logger';
import { registerSlashCommands } from '#utils/slashRegistration';

let shardInfo = null;
try {
        shardInfo = getInfo();
} catch (error) {
        shardInfo = null;
        // console.error(`Error while getting shard info: ${error}`);
}

export class Raze extends Client {
        constructor() {
                const clientOptions = {
                        intents: [
                                GatewayIntentBits.Guilds,
                                GatewayIntentBits.GuildMembers,
                                GatewayIntentBits.GuildMessages,
                                GatewayIntentBits.GuildVoiceStates,
                                GatewayIntentBits.GuildMessageReactions,
                                GatewayIntentBits.MessageContent,
                        ],
                        partials: [
                                Partials.Channel,
                                Partials.GuildMember,
                                Partials.Message,
                                Partials.User,
                        ],
                        makeCache: Options.cacheWithLimits({
                                MessageManager: 100,
                                PresenceManager: 0,
                                UserManager: 100,
                        }),
                        failIfNotExists: false,
                        allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
                };

                if (shardInfo) {
                        clientOptions.shards = shardInfo.SHARD_LIST;
                        clientOptions.shardCount = shardInfo.TOTAL_SHARDS;
                }

                super(clientOptions);

                this.cluster = shardInfo ? new ClusterClient(this) : null;
                this.commands = new Collection();
                this.logger = logger;
                this.config = config;
                this.db = db;
                this.music = new MusicManager(this);
                this.lavalink = this.music.lavalink;

                this.commandHandler = new CommandHandler(this);
                this.eventHandler = new EventLoader(this);
                this.noPrefixUsers = new Set();

                this.startTime = Date.now();
                this.rest = new REST({ version: '10' }).setToken(config.token);
        }

        async init() {
                this.logger.info('Raze', `❄️ Initializing bot...`);
                try {
                        await this.eventHandler.loadAllEvents();
                        await this.commandHandler.loadCommands();
                        this.noPrefixUsers = new Set();
                        try {
                            const allUsers = this.db.user.all("SELECT id FROM users WHERE no_prefix = 1");
                            if (allUsers && Array.isArray(allUsers)) {
                                allUsers.forEach(u => this.noPrefixUsers.add(u.id));
                                this.logger.info('Raze', `Loaded ${this.noPrefixUsers.size} no-prefix users into memory.`);
                            }
                        } catch (error) {
                            this.logger.error('Raze', 'Failed to load no-prefix users:', error);
                        }
                        await registerSlashCommands(this);
                        await this.login(config.token);

                        this.logger.success(
                                'Raze',
                                `❄️ Bot has successfully initialized. 🌸`,
                        );
                        this.logger.info('Raze', '❄️ Raze - Coded by Void & CodeZ devs');
                } catch (error) {
                        this.logger.error(
                                'Raze',
                                '❄️ Failed to initialize bot cluster:',
                                error,
                        );
                        throw error;
                }
        }

        async cleanup() {
                this.logger.warn('Raze', `❄️ Starting cleanup for bot...`);
                try {
                        await this.db.closeAll();
                        this.destroy();
                        this.logger.success(
                                'Raze',
                                '❄️ Cleanup completed successfully. 🌸',
                        );
                } catch (error) {
                        this.logger.error(
                                'Raze',
                                '❄️ An error occurred during cleanup:',
                                error,
                        );
                }
        }

        get uptime() {
                return Date.now() - this.startTime;
        }
}
