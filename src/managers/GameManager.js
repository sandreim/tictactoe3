import { GameState } from './GameState.js';

export class GameManager {
    constructor(chainManager, accountManager) {
        this.chainManager = chainManager;
        this.accountManager = accountManager;
        
        // Use GameState object to manage all game state
        this.gameState = new GameState(chainManager, accountManager);
        
        this.eventsSubscribed = false;
        
        this.gameStats = {
            xWins: 0,
            oWins: 0,
            draws: 0
        };
        
        this.loadGameStats();
    }

    async getPlayerGame() {
        // Delegate to GameState
        return await this.gameState.getPlayerGame();
    }

    async setupGame(gameId, playerX, playerO, existingGameData = null) {
        try {
            console.log('setupGame called with:', { gameId, playerX, playerO, hasExistingData: !!existingGameData });
            
            // Initialize game state and refresh from chain
            this.gameState.initialize(gameId, playerX, playerO);
            await this.gameState.refresh();
            
            console.log('✓ Game setup complete:', this.gameState.toJSON());
            
            // Check if game has ended
            if (this.gameState.isEnded) {
                const state = this.gameState.gameState;
                const stateHuman = state.toHuman();
                
                if (stateHuman === 'XWon' || state.isXWon) {
                    return { ended: true, state: 1 };
                } else if (stateHuman === 'OWon' || state.isOWon) {
                    return { ended: true, state: 2 };
                } else if (stateHuman === 'Draw' || state.isDraw) {
                    return { ended: true, state: 3 };
                }
            }
            
            return { ended: false };

        } catch (error) {
            console.error('Error setting up game:', error);
            throw error;
        }
    }


    async makeMove(position) {
        if (!this.chainManager.api || !this.accountManager.isConnected()) {
            throw new Error('Not connected to chain or wallet');
        }

        console.log(`Making on-chain move: game ${this.gameState.gameId}, position ${position}`);

        const tx = this.chainManager.api.tx.ticTacToe.makeMove(this.gameState.gameId, position);
        return tx;
    }

    async claimTimeout() {
        if (!this.chainManager.api || !this.accountManager.isConnected()) {
            throw new Error('Not connected to chain or wallet');
        }

        if (this.gameState.gameId === null || this.gameState.gameId === undefined) {
            throw new Error('No active game');
        }

        console.log(`Claiming timeout victory for game ${this.gameState.gameId}`);

        const tx = this.chainManager.api.tx.ticTacToe.claimTimeout(this.gameState.gameId);
        return tx;
    }

    handleGameEnd(stateU8) {
        this.gameState.isActive = false;
        this.gameState.isEnded = true;
        
        let message = '';
        let winnerType = null;
        
        switch(stateU8) {
            case 1: // XWon
                message = '🎉 Player X wins!';
                winnerType = 'winner';
                if (this.gameState.playerSymbol === 'X') {
                    this.gameStats.xWins++;
                }
                break;
            case 2: // OWon
                message = '🎉 Player O wins!';
                winnerType = 'winner';
                if (this.gameState.playerSymbol === 'O') {
                    this.gameStats.oWins++;
                }
                break;
            case 3: // Draw
                message = "🤝 It's a draw!";
                winnerType = 'draw';
                this.gameStats.draws++;
                break;
        }

        this.saveGameStats();
        
        // Notify state change so UI updates with final board state
        this.gameState.notifyStateChange();
        
        return { message, winnerType, stats: this.gameStats };
    }

    resetGame() {
        this.gameState.reset();
        this.eventsSubscribed = false;
    }

    subscribeToGameEvents(callback) {
        if (this.eventsSubscribed || !this.chainManager.api) {
            console.log('Events already subscribed or API not ready');
            return;
        }
        
        console.log('Subscribing to game events...');
        this.eventsSubscribed = true;
        
        this.chainManager.api.query.system.events(async (events) => {
            // Process MoveMade events first
            for (const { event } of events) {
                if (this.chainManager.api.events.ticTacToe.MoveMade.is(event)) {
                    const [gameId, player, position] = event.data;
                    if (gameId.toNumber() === this.gameState.gameId) {
                        console.log(`Move made in game ${gameId} by ${player} at position ${position}`);
                        callback('moveMade', { gameId: gameId.toNumber() });
                    }
                }
            }
            
            // Then process other events
            events.forEach(({ event }) => {
                if (this.chainManager.api.events.ticTacToe.GameCreated.is(event)) {
                    const [gameId, playerX, playerO] = event.data;
                    callback('gameCreated', { 
                        gameId: gameId.toNumber(), 
                        playerX: playerX.toString(), 
                        playerO: playerO.toString() 
                    });
                }
                
                if (this.chainManager.api.events.ticTacToe.GameEnded.is(event)) {
                    const [gameId, stateU8] = event.data;
                    if (gameId.toNumber() === this.gameState.gameId) {
                        console.log(`Current game ${gameId} ended with state: ${stateU8}`);
                        callback('gameEnded', { 
                            gameId: gameId.toNumber(), 
                            state: stateU8.toNumber() 
                        });
                    }
                }
            });
        });
    }

    saveGameStats() {
        localStorage.setItem('tictactoe_stats', JSON.stringify(this.gameStats));
    }

    loadGameStats() {
        const saved = localStorage.getItem('tictactoe_stats');
        if (saved) {
            try {
                this.gameStats = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading game stats:', e);
            }
        }
    }

    getGameInfo() {
        return {
            currentGameId: this.gameState.gameId,
            currentPlayerSymbol: this.gameState.playerSymbol,
            opponentAddress: this.gameState.opponentAddress,
            gameActive: this.gameState.isActive,
            gameBoard: this.gameState.board,
            gameStats: this.gameStats
        };
    }
}

