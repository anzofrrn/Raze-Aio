import { logger } from '#utils/logger';

const reconnectionState = new Map();

export default {
        name: "error",
        once: false,
        async execute(node, error, payload, musicManager, client) {
                try {
                        const errorMessage = error?.message || String(error);
                        logger.error('LavalinkNode', `Lavalink Node #${node.id} error:`, errorMessage);
                        
                        const is429 = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
                        const isConnectionError = error?.code === 'ECONNREFUSED' || 
                                                  error?.code === 'ECONNRESET' || 
                                                  error?.code === 'ETIMEDOUT' ||
                                                  errorMessage.includes('WebSocket was closed');
                        
                        if (is429) {
                                logger.warn('LavalinkNode', `Rate limited (429) on Node #${node.id}, will use longer backoff...`);
                        } else if (isConnectionError) {
                                logger.warn('LavalinkNode', `Connection issue detected for Node #${node.id}, will auto-retry...`);
                        }
                        
                        if (!node.connected) {
                                const nodeState = reconnectionState.get(node.id) || { attempts: 0, pending: false, lastAttempt: 0 };
                                
                                if (nodeState.pending) {
                                        logger.debug('LavalinkNode', `Reconnection already pending for Node #${node.id}, skipping...`);
                                        return;
                                }
                                
                                nodeState.attempts++;
                                nodeState.pending = true;
                                reconnectionState.set(node.id, nodeState);
                                
                                const baseDelay = is429 ? 30000 : 10000;
                                const maxDelay = is429 ? 300000 : 120000;
                                const delay = Math.min(baseDelay * Math.pow(1.5, nodeState.attempts - 1), maxDelay);
                                
                                logger.info('LavalinkNode', `Scheduling reconnection for Node #${node.id} in ${Math.round(delay / 1000)}s (attempt ${nodeState.attempts})...`);
                                
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
                                                        logger.success('LavalinkNode', `Reconnection initiated for Node #${node.id}`);
                                                        
                                                        if (reconnectionState.has(node.id)) {
                                                                reconnectionState.get(node.id).attempts = 0;
                                                        }
                                                }
                                        } catch (reconnectError) {
                                                const reconnectMsg = reconnectError?.message || String(reconnectError);
                                                if (reconnectMsg.includes('429')) {
                                                        logger.warn('LavalinkNode', `Still rate limited on Node #${node.id}, will retry with longer delay...`);
                                                } else {
                                                        logger.warn('LavalinkNode', `Reconnection pending for Node #${node.id}: ${reconnectMsg}`);
                                                }
                                        }
                                }, delay);
                        }
                } catch (error_) {
                        logger.error('LavalinkNode', 'Error in node error event handler:', error_);
                }
        }
};

export function resetNodeReconnectionState(nodeId) {
        reconnectionState.delete(nodeId);
}

export function getReconnectionState() {
        return reconnectionState;
}
