/**
 * GameState - Encapsulates all game state and provides methods to refresh from chain
 */
export class GameState {
    constructor(chainManager, accountManager) {
        this.chainManager = chainManager;
        this.accountManager = accountManager;
        
        // Game state
        this.gameId = null;
        this.isActive = false;
        this.board = Array(9).fill(null);
        this.playerSymbol = null; // 'X' or 'O'
        this.opponentAddress = null;
        this.playerX = null;
        this.playerO = null;
        this.isMyTurn = false;
        this.isEnded = false;
        this.gameState = null; // InProgress, XWon, OWon, Draw
        
        // Callbacks for state changes
        this.onStateChangeCallbacks = [];
    }
    
    /**
     * Register a callback to be called when state changes
     */
    onStateChange(callback) {
        this.onStateChangeCallbacks.push(callback);
    }
    
    /**
     * Notify all registered callbacks of state change
     */
    notifyStateChange() {
        console.log(`🔔 notifyStateChange called. Callbacks: ${this.onStateChangeCallbacks.length}`);
        console.log(`   State:`, {
            gameId: this.gameId,
            isMyTurn: this.isMyTurn,
            playerSymbol: this.playerSymbol,
            isActive: this.isActive,
            isEnded: this.isEnded
        });
        
        this.onStateChangeCallbacks.forEach((callback, index) => {
            try {
                console.log(`  Calling callback #${index}`);
                callback(this);
            } catch (error) {
                console.error(`Error in state change callback #${index}:`, error);
            }
        });
    }

    /**
     * Initialize game state with basic info
     */
    initialize(gameId, playerX, playerO) {
        const currentAddr = this.accountManager.getAddress();
        
        if (currentAddr !== playerX && currentAddr !== playerO) {
            throw new Error('You are not a player in this game');
        }

        this.gameId = gameId;
        this.playerX = playerX;
        this.playerO = playerO;
        this.playerSymbol = (currentAddr === playerX) ? 'X' : 'O';
        this.opponentAddress = (currentAddr === playerX) ? playerO : playerX;
        this.isActive = true;
        
        console.log(`Game ${gameId} initialized. You are Player ${this.playerSymbol}`);
        // Don't call notifyStateChange here - turn info not set yet
        // Will be called by refresh() after initialization
    }

    /**
     * Get the active game for the current player
     */
    async getPlayerGame() {
        if (!this.chainManager.api || !this.accountManager.isConnected()) {
            return null;
        }

        try {
            const playerAddress = this.accountManager.getAddress();
            console.log('Fetching active game for player:', playerAddress);
            
            const api = this.chainManager.api;
            
            // Encode the player address parameter
            const playerParam = api.createType('AccountId32', playerAddress);
            
            // Call the runtime API using the helper
            const result = await this.chainManager.callRuntimeAPI(
                'TicTacToeApi',
                'get_player_game',
                [playerParam]
            );
            
            // Decode the result as Option<(u32, Game)>
            const gameOption = api.createType('Option<(u32, Game)>', result);
            
            if (gameOption.isNone) {
                console.log('No active game found');
                return null;
            }
            
            const [gameId, game] = gameOption.unwrap();
            console.log(`Found active game #${gameId.toNumber()}`);
            
            return [gameId.toNumber(), game];
            
        } catch (error) {
            console.error('Error fetching player game:', error);
            throw error;
        }
    }

    /**
     * Refresh game state from chain using runtime API
     * Always fetches the player's current active game
     */
    async refresh() {
        if (!this.chainManager.api) {
            console.warn('Cannot refresh: API not ready');
            return false;
        }

        try {
            console.log('Refreshing game state from chain...');
            
            // Always fetch the player's current active game
            const game = await this.getPlayerGame();
            
            if (!game) {
                console.log('No active game found for player');
                // If we had a game before, it means it ended
                if (this.gameId !== null) {
                    console.log('Previous game has ended');
                    this.isActive = false;
                    this.isEnded = true;
                }
                return false;
            }
            
            const [gameId, gameData] = game;
            console.log(`Refreshing game #${gameId} from chain:`, gameData.toHuman());
            
            // Initialize if this is a new game or first time
            if (this.gameId !== gameId) {
                console.log(`Game ID changed from ${this.gameId} to ${gameId}, re-initializing`);
                this.initialize(gameId, gameData.player_x.toString(), gameData.player_o.toString());
            }
            
            // Update board
            this.updateBoard(gameData.board);
            
            // Update turn info - properly handle boolean field (can't use || with booleans)
            const xTurn = gameData.x_turn !== undefined ? gameData.x_turn : gameData.xTurn;
            const oldIsMyTurn = this.isMyTurn;
            
            console.log('🔄 Turn data from chain:', {
                'gameData.x_turn': gameData.x_turn,
                'gameData.xTurn': gameData.xTurn,
                'resolved xTurn': xTurn,
                'xTurn type': typeof xTurn,
                'xTurn.valueOf()': xTurn?.valueOf ? xTurn.valueOf() : xTurn,
                'playerSymbol': this.playerSymbol,
                'oldIsMyTurn': oldIsMyTurn
            });
            
            // Convert Polkadot.js Bool Codec type to primitive boolean
            const xTurnBool = xTurn?.valueOf ? xTurn.valueOf() : !!xTurn;
            
            // Calculate and store as primitive boolean
            this.isMyTurn = (this.playerSymbol === 'X' && xTurnBool) || 
                           (this.playerSymbol === 'O' && !xTurnBool);
            
            console.log('Turn calculation result:', {
                xTurnBool,
                playerSymbol: this.playerSymbol,
                oldIsMyTurn,
                newIsMyTurn: this.isMyTurn,
                'newIsMyTurn type': typeof this.isMyTurn,
                changed: oldIsMyTurn !== this.isMyTurn
            });
            
            // Update game state (ended or in progress)
            const state = gameData.state;
            this.gameState = state;
            
            if (!state.isInProgress) {
                this.isActive = false;
                this.isEnded = true;
                console.log('Game has ended:', state.toHuman());
            }
            
            console.log(`✓ Refreshed game #${this.gameId}:`, {
                board: this.board,
                isMyTurn: this.isMyTurn,
                isEnded: this.isEnded,
                state: this.gameState?.toHuman()
            });
            
            this.notifyStateChange();
            return true;
            
        } catch (error) {
            console.error('Error refreshing game state:', error);
            return false;
        }
    }

    /**
     * Update board from chain data
     * Note: Does NOT call notifyStateChange() - caller should do that after all updates
     */
    updateBoard(boardData) {
        const updatedBoard = Array(9).fill(null);
        
        boardData.forEach((cell, index) => {
            const cellValue = this.decodeCellValue(cell);
            if (cellValue) {
                updatedBoard[index] = cellValue;
            }
        });
        
        this.board = updatedBoard;
        console.log('Board updated:', updatedBoard);
    }

    /**
     * Decode cell value from various formats
     */
    decodeCellValue(cell) {
        // Try different ways to decode the cell
        if (cell.isX || cell.toHuman?.() === 'X' || cell.toJSON?.() === 'X') {
            return 'X';
        } else if (cell.isO || cell.toHuman?.() === 'O' || cell.toJSON?.() === 'O') {
            return 'O';
        }
        return null; // Empty
    }

    /**
     * Handle game events from chain
     */
    async handleEvent(eventType, data) {
        console.log(`🎮 GameState handling event: ${eventType}`, data);
        
        switch (eventType) {
            case 'gameCreated':
                // Check if this game involves us
                const currentAddr = this.accountManager.getAddress();
                if (data.playerX === currentAddr || data.playerO === currentAddr) {
                    console.log('New game created for us, refreshing state...');
                    await this.refresh();
                }
                break;
                
            case 'moveMade':
                // Refresh game state to get latest board and turn info
                console.log('Move made, refreshing state...');
                await this.refresh();
                break;
                
            case 'gameEnded':
                console.log('Game ended, marking as inactive');
                this.isActive = false;
                this.isEnded = true;
                this.notifyStateChange();
                break;
        }
    }

    /**
     * Reset game state
     */
    reset() {
        this.gameId = null;
        this.isActive = false;
        this.board = Array(9).fill(null);
        this.playerSymbol = null;
        this.opponentAddress = null;
        this.playerX = null;
        this.playerO = null;
        this.isMyTurn = false;
        this.isEnded = false;
        this.gameState = null;
        
        console.log('Game state reset');
        this.notifyStateChange();
    }

    /**
     * Get current state as plain object
     */
    toJSON() {
        return {
            gameId: this.gameId,
            isActive: this.isActive,
            isEnded: this.isEnded,
            board: this.board,
            playerSymbol: this.playerSymbol,
            opponentAddress: this.opponentAddress,
            playerX: this.playerX,
            playerO: this.playerO,
            isMyTurn: this.isMyTurn,
            gameState: this.gameState?.toHuman?.() || this.gameState
        };
    }
}

