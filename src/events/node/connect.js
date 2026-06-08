import { logger } from '#utils/logger';
import { resetNodeReconnectionState } from './error.js';

export default {
        name: "connect",
        once: false,
        async execute(node, payload, musicManager, client) {
                try {
                        logger.success('LavalinkNode', `Lavalink Node #${node.id} connected successfully`);
                        logger.info('LavalinkNode', `Node: ${node.options.host}:${node.options.port}`);
                        
                        resetNodeReconnectionState(node.id);
                        
                        if (node.sessionId) {
                                logger.info('LavalinkNode', `Session ID: ${node.sessionId}`);
                        }
                        
                        const stats = node.stats;
                        if (stats) {
                                logger.info('LavalinkNode', `Players: ${stats.players || 0} | Playing: ${stats.playingPlayers || 0} | Uptime: ${Math.floor((stats.uptime || 0) / 1000 / 60)}m`);
                        }
                } catch (error) {
                        logger.error('LavalinkNode', 'Error in node connect event handler:', error);
                }
        }
};
