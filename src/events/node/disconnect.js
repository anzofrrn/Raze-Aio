import { logger } from '#utils/logger';
import { getReconnectionState, resetNodeReconnectionState } from './error.js';

export default {
        name: "disconnect",
        once: false,
        async execute(node, reason, payload, musicManager, client) {
                try {
                        const reasonStr = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
                        logger.warn('LavalinkNode', `Lavalink Node #${node.id} disconnected. Reason: ${reasonStr}`);
                        
                        const reconnectionState = getReconnectionState();
                        const nodeState = reconnectionState.get(node.id);
                        
                        if (nodeState?.pending) {
                                logger.debug('LavalinkNode', `Reconnection already scheduled via error handler for Node #${node.id}, skipping duplicate...`);
                                return;
                        }
                        
                        const is429 = reasonStr.includes('429') || reasonStr.includes('Too Many Requests');
                        const currentAttempts = nodeState?.attempts || 0;
                        
                        const baseDelay = is429 ? 30000 : 15000;
                        const maxDelay = is429 ? 300000 : 120000;
                        const delay = Math.min(baseDelay * Math.pow(1.5, currentAttempts), maxDelay);
                        
                        logger.info('LavalinkNode', `Scheduling reconnection for Node #${node.id} in ${Math.round(delay / 1000)}s...`);
                        
                        const newState = { 
                                attempts: currentAttempts + 1, 
                                pending: true, 
                                lastAttempt: nodeState?.lastAttempt || 0 
                        };
                        reconnectionState.set(node.id, newState);
                        
                        setTimeout(async () => {
                                const currentState = reconnectionState.get(node.id);
                                if (currentState) {
                                        currentState.pending = false;
                                        currentState.lastAttempt = Date.now();
                                        reconnectionState.set(node.id, currentState);
                                }
                                
                                try {
                                        if (node && !node.connected) {
                                                await node.connect();
                                                logger.success('LavalinkNode', `Reconnection attempt initiated for Node #${node.id}`);
                                                resetNodeReconnectionState(node.id);
                                        }
                                } catch (reconnectError) {
                                        const errorMsg = reconnectError?.message || String(reconnectError);
                                        if (errorMsg.includes('429')) {
                                                logger.warn('LavalinkNode', `Rate limited during reconnection for Node #${node.id}`);
                                        } else {
                                                logger.error('LavalinkNode', `Failed to reconnect to Node #${node.id}:`, errorMsg);
                                        }
                                }
                        }, delay);
                } catch (error) {
                        logger.error('LavalinkNode', 'Error in node disconnect event handler:', error);
                }
        }
};
