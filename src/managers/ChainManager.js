import { ApiPromise, WsProvider } from '@polkadot/api';

export class ChainManager {
    constructor() {
        this.api = null;
        this.unsubscribeBlocks = null;
        this.unsubscribeFinalizedBlocks = null;
        this.blockWindow = [];
        this.maxBlocksInWindow = 50;
        this.finalizedBlockNumber = 0;
        this.blockTimestamps = new Map();
        this.onBlockCallback = null;
    }

    async connect(rpcUrl) {
        // Disconnect existing connection
        if (this.api) {
            await this.api.disconnect();
            this.stopBlockSubscription();
        }

        // Create new connection
        const provider = new WsProvider(rpcUrl);
        
        // Define custom types for Tic-Tac-Toe
        const types = {
            Cell: {
                _enum: ['Empty', 'X', 'O']
            },
            GameState: {
                _enum: ['InProgress', 'XWon', 'OWon', 'Draw']
            },
            Game: {
                player_x: 'AccountId',
                player_o: 'AccountId',
                x_turn: 'bool',
                board: '[Cell; 9]',
                state: 'GameState'
            }
        };

        this.api = await ApiPromise.create({ 
            provider,
            noInitWarn: true,
            types
        });
        
        // Ensure API is ready
        await this.api.isReady;
        

        return this.api;
    }
    
    /**
     * Call a runtime API with proper parameter encoding
     * @param {string} apiName - The runtime API name (e.g., 'TicTacToeApi')
     * @param {string} methodName - The method name (e.g., 'get_player_game')
     * @param {Array} params - Array of parameters (will be SCALE-encoded)
     * @returns {Promise} The decoded result
     */
    async callRuntimeAPI(apiName, methodName, params = []) {
        if (!this.api) {
            throw new Error('API not connected');
        }
        
        const fullMethodName = `${apiName}_${methodName}`;
        console.log(`Calling runtime API: ${fullMethodName}`);
        console.log('Params:', params.map(p => ({ 
            value: p.toString(), 
            hex: p.toHex(), 
            u8a: Array.from(p.toU8a()) 
        })));
        
        // Encode parameters by concatenating their SCALE-encoded bytes
        let encodedParams = '0x';
        if (params.length > 0) {
            // Concatenate all parameter bytes
            const allBytes = [];
            params.forEach(param => {
                const bytes = param.toU8a();
                allBytes.push(...bytes);
            });
            encodedParams = this.api.createType('Bytes', allBytes).toHex();
        }
        
        console.log('Encoded params (hex):', encodedParams);
        
        // Call the runtime API
        const result = await this.api.rpc.state.call(fullMethodName, encodedParams);
        console.log('Raw result:', result.toHex());
        
        return result;
    }

    async disconnect() {
        if (this.api) {
            await this.api.disconnect();
            this.api = null;
        }
        this.stopBlockSubscription();
    }

    async getChainInfo() {
        if (!this.api) {
            throw new Error('Not connected to chain');
        }

        const [chain, version] = await Promise.all([
            this.api.rpc.system.chain(),
            this.api.rpc.system.version()
        ]);

        return {
            chain: chain.toString(),
            version: version.toString()
        };
    }

    subscribeToBlocks(callback) {
        if (!this.api) {
            return;
        }

        this.onBlockCallback = callback;

        // Subscribe to new blocks (best blocks)
        this.unsubscribeBlocks = this.api.rpc.chain.subscribeNewHeads((header) => {
            this.updateBlockInfo(header);
            if (callback) {
                callback();
            }
        });

        // Get finalized blocks
        this.unsubscribeFinalizedBlocks = this.api.rpc.chain.subscribeFinalizedHeads((header) => {
            this.updateFinalizedBlockInfo(header);
        });
    }

    updateBlockInfo(header) {
        const blockNumber = header.number.toNumber();
        const blockHash = header.hash.toString();
        const timestamp = Date.now();
        
        // Store timestamp
        this.blockTimestamps.set(blockNumber, timestamp);
        
        // Add to block window
        this.addBlockToWindow(blockNumber, blockHash, false);
    }

    updateFinalizedBlockInfo(header) {
        const blockNumber = header.number.toNumber();
        this.finalizedBlockNumber = blockNumber;
        
        // Mark finalized blocks in the window
        this.markFinalizedBlocks();
    }

    addBlockToWindow(blockNumber, blockHash, isFinalized) {
        // Check if block already exists
        const existingIndex = this.blockWindow.findIndex(b => b.number === blockNumber);
        if (existingIndex !== -1) {
            return; // Block already exists
        }

        // Add new block
        const block = {
            number: blockNumber,
            hash: blockHash,
            isFinalized: isFinalized || blockNumber <= this.finalizedBlockNumber
        };

        this.blockWindow.push(block);

        // Sort by block number (newest first for display)
        this.blockWindow.sort((a, b) => b.number - a.number);

        // Calculate how many blocks can fit
        const windowElement = document.getElementById('blockWindow');
        if (windowElement) {
            const containerWidth = windowElement.offsetWidth;
            const blockWidth = 42; // min-width of block-item
            const gap = 4; // gap between blocks
            const maxVisibleBlocks = Math.floor(containerWidth / (blockWidth + gap));
            
            // Keep only blocks that fit, drop oldest (end of sorted array)
            if (this.blockWindow.length > maxVisibleBlocks) {
                this.blockWindow = this.blockWindow.slice(0, maxVisibleBlocks);
                
                // Clean up timestamps for dropped blocks
                const remainingNumbers = new Set(this.blockWindow.map(b => b.number));
                for (const [num] of this.blockTimestamps) {
                    if (!remainingNumbers.has(num)) {
                        this.blockTimestamps.delete(num);
                    }
                }
            }
        }

        // Update UI
        this.renderBlockWindow();
    }

    markFinalizedBlocks() {
        // Update finalized status for all blocks
        this.blockWindow.forEach(block => {
            if (block.number <= this.finalizedBlockNumber) {
                block.isFinalized = true;
            }
        });

        // Update UI
        this.renderBlockWindow();
    }

    renderBlockWindow() {
        const windowElement = document.getElementById('blockWindow');
        const timelineElement = document.getElementById('blockTimeline');
        if (!windowElement || !timelineElement) return;

        // Render blocks
        windowElement.innerHTML = '';
        this.blockWindow.forEach((block, index) => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'block-item';
            if (block.isFinalized) {
                blockDiv.classList.add('finalized');
            }
            if (index === 0) {
                blockDiv.classList.add('new-block');
            }

            const shortHash = `${block.hash.slice(2, 6)}${block.hash.slice(-2)}`;
            
            blockDiv.innerHTML = `
                <div class="block-number">${block.number}</div>
                <div class="block-hash-short">${shortHash}</div>
            `;
            
            const timestamp = this.blockTimestamps.get(block.number);
            const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
            blockDiv.title = `Block #${block.number.toLocaleString()}\n${block.hash}\n${timeStr}\n${block.isFinalized ? '✓ Finalized' : 'Pending'}`;

            windowElement.appendChild(blockDiv);
        });

        // Render timeline
        timelineElement.innerHTML = '';
        this.blockWindow.forEach((block, index) => {
            const tickDiv = document.createElement('div');
            tickDiv.className = 'timeline-tick';
            
            const timestamp = this.blockTimestamps.get(block.number);
            let deltaStr = '--';
            
            if (timestamp && index < this.blockWindow.length - 1) {
                // Get previous block (next in array since sorted newest first)
                const prevBlock = this.blockWindow[index + 1];
                const prevTimestamp = this.blockTimestamps.get(prevBlock.number);
                
                if (prevTimestamp) {
                    const deltaMs = timestamp - prevTimestamp;
                    const deltaSeconds = (deltaMs / 1000).toFixed(1);
                    deltaStr = `${deltaSeconds}s`;
                    
                    // Major tick if delta is >= 10 seconds
                    if (parseFloat(deltaSeconds) >= 10.0) {
                        tickDiv.classList.add('major');
                    }
                }
            }
            
            tickDiv.innerHTML = `
                <div class="tick-mark"></div>
                <div class="tick-time">${deltaStr}</div>
            `;

            timelineElement.appendChild(tickDiv);
        });
    }

    stopBlockSubscription() {
        if (this.unsubscribeBlocks) {
            this.unsubscribeBlocks();
            this.unsubscribeBlocks = null;
        }
        if (this.unsubscribeFinalizedBlocks) {
            this.unsubscribeFinalizedBlocks();
            this.unsubscribeFinalizedBlocks = null;
        }
    }

    isConnected() {
        return this.api !== null && this.api.isConnected;
    }
}

