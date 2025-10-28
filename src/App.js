import { ChainManager } from './managers/ChainManager.js';
import { AccountManager } from './managers/AccountManager.js';
import { GameManager } from './managers/GameManager.js';
import { MatchmakingManager } from './managers/MatchmakingManager.js';
import { TransactionManager } from './managers/TransactionManager.js';
import { UIManager } from './managers/UIManager.js';

export class App {
    constructor() {
        // Initialize managers
        this.chainManager = new ChainManager();
        this.accountManager = new AccountManager(this.chainManager);
        this.gameManager = new GameManager(this.chainManager, this.accountManager);
        this.matchmakingManager = new MatchmakingManager(this.chainManager, this.accountManager);
        this.transactionManager = new TransactionManager();
        this.uiManager = new UIManager(this.gameManager);

        // Timeout tracking
        this.timeoutTimer = null;
        this.timeoutStartTime = null;
        this.TIMEOUT_SECONDS = 60;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.uiManager.updateGameStats(this.gameManager.gameStats);
    }

    setupEventListeners() {
        // Connection
        this.uiManager.elements.connectBtn.addEventListener('click', () => this.handleConnect());

        // Account
        this.uiManager.elements.connectWalletBtn.addEventListener('click', () => this.handleConnectWallet());
        this.uiManager.elements.useSeedBtn.addEventListener('click', () => this.uiManager.showSeedInput());
        this.uiManager.elements.importSeedBtn.addEventListener('click', () => this.handleImportSeed());
        this.uiManager.elements.cancelSeedBtn.addEventListener('click', () => this.uiManager.hideSeedInput());

        // Matchmaking
        this.uiManager.elements.playGameBtn.addEventListener('click', () => this.handlePlayGame());
        this.uiManager.elements.cancelMatchmakingBtn.addEventListener('click', () => this.handleCancelMatchmaking());

        // Game
        this.uiManager.elements.resetGameBtn.addEventListener('click', () => this.handleResetGame());
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const cellIndex = parseInt(e.target.getAttribute('data-cell'));
                this.handleCellClick(cellIndex);
            });
        });

        // Transactions
        this.uiManager.elements.clearHistoryBtn.addEventListener('click', () => {
            this.transactionManager.clearHistory();
            this.uiManager.renderTransactionHistory([]);
            this.uiManager.updatePendingCount(0);
        });

        // Timeout
        this.uiManager.elements.claimTimeoutBtn.addEventListener('click', () => this.handleClaimTimeout());
    }

    async handleConnect() {
        const rpcUrl = this.uiManager.elements.rpcUrl.value.trim();
        const connectBtn = this.uiManager.elements.connectBtn;
        
        if (!rpcUrl) {
            alert('Please enter a valid RPC URL');
            return;
        }

        try {
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;

            await this.chainManager.connect(rpcUrl);
            const chainInfo = await this.chainManager.getChainInfo();

            this.uiManager.updateConnectionStatus(true, 'Connected');
            this.uiManager.showChainInfo(chainInfo.chain, chainInfo.version);
            this.uiManager.showBlockBanner();

            // Subscribe to blocks
            this.chainManager.subscribeToBlocks(async () => {
                // Update account info on each block
                if (this.accountManager.isConnected()) {
                    try {
                        const balance = await this.accountManager.getBalance();
                        this.uiManager.updateBalance(balance);
                    } catch (error) {
                        console.error('Error updating balance:', error);
                    }
                }
            });

            // Subscribe to game events
            this.gameManager.subscribeToGameEvents(async (eventType, data) => {
                await this.handleGameEvent(eventType, data);
            });

            connectBtn.textContent = 'Connected';
            connectBtn.disabled = false;

        } catch (error) {
            console.error('Connection error:', error);
            alert(`Failed to connect: ${error.message}`);
            this.uiManager.updateConnectionStatus(false, 'Disconnected');
            connectBtn.textContent = 'Connect';
            connectBtn.disabled = false;
        }
    }

    async handleConnectWallet() {
        try {
            const account = await this.accountManager.connectWallet();
            this.uiManager.updateAccountInfo(account.address, 'extension');

            // Start balance updates
            this.accountManager.startBalanceUpdates((balance) => {
                this.uiManager.updateBalance(balance);
            });

            // Get initial balance
            const balance = await this.accountManager.getBalance();
            this.uiManager.updateBalance(balance);

            // Check for active game and auto-join
            await this.checkAndJoinActiveGame();

        } catch (error) {
            console.error('Wallet connection error:', error);
            alert(error.message);
        }
    }

    async handleImportSeed() {
        const seedString = this.uiManager.elements.seedPhrase.value.trim();
        
        if (!seedString) {
            alert('Please enter a seed string');
            return;
        }

        try {
            const account = await this.accountManager.createFromSeed(seedString);
            this.uiManager.hideSeedInput();
            this.uiManager.updateAccountInfo(account.address, 'seed');

            // Start balance updates
            this.accountManager.startBalanceUpdates((balance) => {
                this.uiManager.updateBalance(balance);
            });

            // Get initial balance
            const balance = await this.accountManager.getBalance();
            this.uiManager.updateBalance(balance);

            // Check for active game and auto-join
            await this.checkAndJoinActiveGame();

        } catch (error) {
            console.error('Seed import error:', error);
            alert(`Failed to create account: ${error.message}`);
        }
    }

    async handlePlayGame() {
        if (!this.chainManager.isConnected() || !this.accountManager.isConnected()) {
            alert('Please connect to chain and wallet first');
            return;
        }

        const playBtn = this.uiManager.elements.playGameBtn;
        
        try {
            playBtn.disabled = true;
            playBtn.textContent = 'JOINING QUEUE...';

            const tx = await this.matchmakingManager.joinQueue();
            const txData = this.transactionManager.createTransaction(
                'matchmaking',
                this.accountManager.getAddress(),
                'Matchmaking',
                'Start Game'
            );

            const unsub = await this.accountManager.signAndSend(tx, async (result) => {
                await this.handleTransactionStatus(result, txData, unsub, (eventData) => {
                    // Check for PlayerJoinedQueue or GameCreated events
                    if (eventData.type === 'PlayerJoinedQueue') {
                        this.uiManager.showMatchmakingWaiting();
                    } else if (eventData.type === 'GameCreated') {
                        this.uiManager.hideMatchmakingWaiting();
                        this.matchmakingManager.setInQueue(false);
                    }
                });
            });

        } catch (error) {
            console.error('Matchmaking error:', error);
            alert(`Failed to join matchmaking: ${error.message}`);
            playBtn.textContent = 'START GAME';
            playBtn.disabled = false;
        }
    }

    async handleCancelMatchmaking() {
        try {
            const tx = await this.matchmakingManager.cancelQueue();
            
            const unsub = await this.accountManager.signAndSend(tx, (result) => {
                if (result.status.isInBlock) {
                    this.uiManager.hideMatchmakingWaiting();
                    unsub();
                }
            });

        } catch (error) {
            console.error('Cancel matchmaking error:', error);
            alert(`Failed to cancel matchmaking: ${error.message}`);
        }
    }

    async checkAndJoinActiveGame() {
        if (!this.chainManager.isConnected() || !this.accountManager.isConnected()) {
            return;
        }

        try {
            console.log('Checking for active game...');
            const game = await this.gameManager.getPlayerGame();
            console.log('Game found:', game);
            
            if (!game) {
                console.log('No active game found');
                return;
            }

            // Load the active game
            const [gameId, gameData] = game;
            console.log(`Auto-loading active game #${gameId}`, gameData);
            await this.setupAndShowGame(gameId, gameData.player_x.toString(), gameData.player_o.toString(), gameData);
            
            // Verify game is active
            const finalGameState = this.gameManager.getGameInfo();
            console.log('Game auto-loaded. Active:', finalGameState.gameActive, 'ID:', finalGameState.currentGameId);

        } catch (error) {
            console.error('Error checking for active game:', error);
            // Don't alert on startup, just log the error
        }
    }


    async handleCellClick(cellIndex) {
        const gameInfo = this.gameManager.getGameInfo();
        
        console.log('Cell clicked:', cellIndex, 'Game info:', gameInfo);
        
        if (!gameInfo.gameActive) {
            console.warn('Game not active!');
            alert('Game is not active. Please start a game first.');
            return;
        }
        
        if (gameInfo.gameBoard[cellIndex] !== null) {
            console.warn('Cell already taken!');
            return;
        }

        if (gameInfo.currentGameId === null || gameInfo.currentGameId === undefined) {
            alert('Please start a game first');
            return;
        }

        try {
            const tx = await this.gameManager.makeMove(cellIndex);
            const txData = this.transactionManager.createTransaction(
                'game_move',
                this.accountManager.getAddress(),
                `Game #${gameInfo.currentGameId}`,
                `Move at [${cellIndex}]`
            );

            const unsub = await this.accountManager.signAndSend(tx, async (result) => {
                await this.handleTransactionStatus(result, txData, unsub);
                
                // When transaction is in block, start timeout for opponent's turn
                if (result.status.isInBlock) {
                    this.startTimeoutTimer();
                }
            });

        } catch (error) {
            console.error('Move error:', error);
            alert(`Failed to make move: ${error.message}`);
        }
    }

    handleResetGame() {
        this.stopTimeoutTimer();
        this.gameManager.resetGame();
        this.uiManager.hideGameBoard();
        this.uiManager.hideGameMessage();
        this.uiManager.hideMatchmakingWaiting();
        this.uiManager.hideTimeoutSection();
        this.uiManager.updateBoard(Array(9).fill(null));
    }

    startTimeoutTimer() {
        console.log('⏱️ Starting timeout timer (opponent\'s turn)');
        this.stopTimeoutTimer(false); // Clear any existing timer, but keep section visible
        
        this.timeoutStartTime = Date.now();
        this.uiManager.showTimeoutSection();
        this.uiManager.hideClaimTimeoutBtn();
        
        this.timeoutTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.timeoutStartTime) / 1000);
            const remaining = Math.max(0, this.TIMEOUT_SECONDS - elapsed);
            
            this.uiManager.updateTimeoutCountdown(remaining);
            
            if (remaining === 0) {
                // Timer expired, show claim button and stop counting
                console.log('⏱️ Timeout expired! Showing claim button');
                clearInterval(this.timeoutTimer);
                this.timeoutTimer = null;
                this.uiManager.showClaimTimeoutBtn();
                // Don't hide the timeout section - keep it visible with the claim button
            }
        }, 1000);
    }

    stopTimeoutTimer(hideSection = true) {
        if (this.timeoutTimer) {
            console.log('⏱️ Stopping timeout timer (your turn or game ended)');
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = null;
        }
        this.timeoutStartTime = null;
        
        if (hideSection) {
            this.uiManager.hideTimeoutSection();
        }
    }

    async handleClaimTimeout() {
        if (this.gameManager.getGameInfo().currentGameId === null || this.gameManager.getGameInfo().currentGameId === undefined) {
            alert('No active game');
            return;
        }

        const confirmClaim = confirm('Claim victory due to opponent timeout?');
        if (!confirmClaim) {
            return;
        }

        try {
            const tx = await this.gameManager.claimTimeout();
            const txData = this.transactionManager.createTransaction(
                'claim_timeout',
                this.accountManager.getAddress(),
                `Game #${this.gameManager.getGameInfo().currentGameId}`,
                'Claim Timeout Victory'
            );

            const unsub = await this.accountManager.signAndSend(tx, async (result) => {
                await this.handleTransactionStatus(result, txData, unsub);
            });

            // Stop the timer
            this.stopTimeoutTimer();

        } catch (error) {
            console.error('Claim timeout error:', error);
            alert(`Failed to claim timeout: ${error.message}`);
        }
    }

    async handleGameEvent(eventType, data) {
        // Let GameState handle the event first (updates game state)
        await this.gameManager.gameState.handleEvent(eventType, data);
        
        // Then handle UI and app flow
        switch (eventType) {
            case 'gameCreated':
                const currentAddr = this.accountManager.getAddress();
                if ((data.playerX === currentAddr || data.playerO === currentAddr) &&
                    this.matchmakingManager.isInQueue()) {
                    console.log('Matched! Loading game...');
                    this.uiManager.hideMatchmakingWaiting();
                    this.matchmakingManager.setInQueue(false);
                    
                    // Show the game UI
                    const gameState = this.gameManager.gameState;
                    if (gameState.gameId !== null) {
                        this.uiManager.showGameBoard();
                        this.uiManager.updateGameInfo(gameState.gameId, gameState.playerX, gameState.playerO);
                        
                        // Start timeout timer if it's opponent's turn
                        if (!gameState.isMyTurn) {
                            this.startTimeoutTimer();
                        }
                    }
                }
                break;

            case 'moveMade':
                // Update timeout timer based on whose turn it is
                const gameState = this.gameManager.gameState;
                if (gameState.isMyTurn) {
                    console.log('It\'s my turn, stopping timeout');
                    this.stopTimeoutTimer();
                } else {
                    console.log('It\'s opponent\'s turn, starting timeout');
                    this.startTimeoutTimer();
                }
                break;

            case 'gameEnded':
                this.stopTimeoutTimer();
                
                // Show end message
                const endResult = this.gameManager.handleGameEnd(data.state);
                this.uiManager.showGameEndMessage(endResult.message, endResult.winnerType);
                this.uiManager.updateGameStats(endResult.stats);
                break;
        }
    }


    async setupAndShowGame(gameId, playerX, playerO, existingGameData = null) {
        try {
            console.log('Setting up game:', { gameId, playerX, playerO, hasExistingData: !!existingGameData });
            const result = await this.gameManager.setupGame(gameId, playerX, playerO, existingGameData);
            console.log('Setup result:', result);
            
            this.uiManager.showGameBoard();
            this.uiManager.updateGameInfo(gameId, playerX, playerO);
            
            const gameInfo = this.gameManager.getGameInfo();
            console.log('Game info:', gameInfo);
            this.uiManager.updateGameStats(gameInfo.gameStats);

            // Board and turn already updated via setupGame -> refresh() -> onStateChange callback
            
            if (result && result.ended) {
                this.stopTimeoutTimer();
                const endResult = this.gameManager.handleGameEnd(result.state);
                this.uiManager.showGameEndMessage(endResult.message, endResult.winnerType);
            } else {
                // Start/stop timeout timer based on whose turn it is
                const gameState = this.gameManager.gameState;
                if (gameState.isMyTurn) {
                    this.stopTimeoutTimer();
                } else {
                    this.startTimeoutTimer();
                }
            }
            
            const finalGameInfo = this.gameManager.getGameInfo();
            console.log('Game setup complete. Final game state:', finalGameInfo);
            
            // Verify the game is properly initialized
            if (!finalGameInfo.gameActive) {
                console.error('WARNING: Game is not active after setup!');
                console.error('Final state:', finalGameInfo);
                alert('Game setup completed but game is not active. Please try again.');
            } else if (finalGameInfo.currentGameId === null || finalGameInfo.currentGameId === undefined) {
                console.error('WARNING: No game ID set after setup!');
                console.error('Final state:', finalGameInfo);
                console.error('Passed game ID:', gameId);
                alert('Game setup completed but no game ID. Please try again.');
            } else {
                console.log('✓ Game is ready to play!');
            }

        } catch (error) {
            console.error('Setup game error:', error);
            console.error('Stack:', error.stack);
            alert(`Failed to setup game: ${error.message}`);
        }
    }

    async handleTransactionStatus(result, txData, unsub, eventCallback) {
        const { status, dispatchError } = result;
        
        if (status.isInvalid) {
            txData.timing.invalid = Date.now();
            txData.status = 'error';
            txData.statusText = 'Invalid';
            this.updateTransactionUI(txData);
            return;
        }

        if (result.txHash && !txData.hash) {
            txData.hash = result.txHash.toHex();
        }

        if (status.isReady) {
            txData.timing.ready = Date.now();
            txData.statusText = 'Ready';
            this.updateTransactionUI(txData);
        }

        if (status.isInBlock) {
            txData.timing.inBlock = Date.now();
            txData.status = 'success';
            txData.statusText = 'In Block';
            txData.blockHash = status.asInBlock.toHex();
            this.updateTransactionUI(txData);

            if (dispatchError) {
                let errorInfo = '';
                if (dispatchError.isModule) {
                    const decoded = this.chainManager.api.registry.findMetaError(dispatchError.asModule);
                    errorInfo = `${decoded.section}.${decoded.name}`;
                } else {
                    errorInfo = dispatchError.toString();
                }
                alert(`Transaction failed: ${errorInfo}`);
                unsub();
                return;
            }

            // Handle events if callback provided
            if (eventCallback) {
                try {
                    const events = await this.chainManager.api.query.system.events.at(status.asInBlock);
                    for (const { event } of events) {
                        if (this.chainManager.api.events.ticTacToe.PlayerJoinedQueue.is(event)) {
                            eventCallback({ type: 'PlayerJoinedQueue' });
                        }
                        if (this.chainManager.api.events.ticTacToe.GameCreated.is(event)) {
                            eventCallback({ type: 'GameCreated' });
                        }
                    }
                } catch (err) {
                    console.error('Error reading events:', err);
                }
            }

            unsub();
        }

        if (status.isFinalized) {
            txData.timing.finalized = Date.now();
            txData.statusText = 'Finalized ✓';
            txData.finalizedBlockHash = status.asFinalized.toHex();
            this.updateTransactionUI(txData);
        }
    }

    updateTransactionUI(txData) {
        let history;
        
        // Check if transaction already exists in history
        const existingTx = this.transactionManager.getHistory().find(tx => tx.id === txData.id);
        
        if (existingTx) {
            // Update existing transaction
            history = this.transactionManager.updateInHistory(txData.hash || txData.id, txData);
        } else {
            // Add new transaction
            history = this.transactionManager.addToHistory(txData);
        }
        
        this.uiManager.renderTransactionHistory(history);
        this.uiManager.updatePendingCount(this.transactionManager.getPendingCount());
    }
}

