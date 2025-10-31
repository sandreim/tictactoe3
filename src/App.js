import { ChainManager } from './managers/ChainManager.js';
import { AccountManager } from './managers/AccountManager.js';
import { GameManager } from './managers/GameManager.js';
import { MatchmakingManager } from './managers/MatchmakingManager.js';
import { TransactionManager } from './managers/TransactionManager.js';
import { UIManager } from './managers/UIManager.js';
import { SoundManager } from './managers/SoundManager.js';

export class App {
    constructor() {
        // Initialize managers
        this.chainManager = new ChainManager();
        this.accountManager = new AccountManager(this.chainManager);
        this.gameManager = new GameManager(this.chainManager, this.accountManager);
        this.matchmakingManager = new MatchmakingManager(this.chainManager, this.accountManager);
        this.transactionManager = new TransactionManager();
        this.uiManager = new UIManager(this.gameManager);
        this.soundManager = new SoundManager();

        // Timeout tracking
        this.timeoutTimer = null;
        this.timeoutStartTime = null;
        this.TIMEOUT_SECONDS = 60;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.uiManager.updateGameStats(this.gameManager.gameStats);
        
        // Initialize chart after a short delay to ensure Chart.js is loaded
        setTimeout(() => {
            this.uiManager.initializeChart();
        }, 100);
        
        // Auto-connect to chain on page load
        setTimeout(() => {
            this.handleConnect();
        }, 500);
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
            cell.addEventListener('click', async (e) => {
                // Resume audio context on first user interaction
                await this.soundManager.resume();
                
                const cellIndex = parseInt(e.target.getAttribute('data-cell'));
                this.handleCellClick(cellIndex);
            });
        });

        // Transactions
        this.uiManager.elements.clearHistoryBtn.addEventListener('click', () => {
            this.transactionManager.clearHistory();
            this.uiManager.renderTransactionHistory([]);
            this.uiManager.updatePendingCount(0);
            this.uiManager.updateChart([]);
            this.uiManager.updateTransactionStats(null);
        });

        // Timeout
        this.uiManager.elements.claimTimeoutBtn.addEventListener('click', () => this.handleClaimTimeout());
        
        // Sound toggle
        document.getElementById('toggleSoundBtn').addEventListener('click', () => this.handleToggleSound());
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

            // Disconnect from previous chain if connected
            if (this.chainManager.isConnected()) {
                console.log('Disconnecting from previous chain...');
                await this.handleDisconnect();
            }

            await this.chainManager.connect(rpcUrl);
            const chainInfo = await this.chainManager.getChainInfo();

            this.uiManager.updateConnectionStatus(true, 'Connected');
            this.uiManager.showChainInfo(chainInfo.chain, chainInfo.version);
            this.uiManager.showBlockBanner();

            // Subscribe to blocks
            await this.chainManager.subscribeToBlocks(async () => {
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
            
            // Enable wallet connection after chain is connected
            this.uiManager.elements.connectWalletBtn.disabled = false;
            this.uiManager.elements.connectWalletBtn.classList.remove('disabled');

        } catch (error) {
            console.error('Connection error:', error);
            alert(`Failed to connect: ${error.message}`);
            this.uiManager.updateConnectionStatus(false, 'Disconnected');
            connectBtn.textContent = 'Connect';
            connectBtn.disabled = false;
        }
    }

    async handleDisconnect() {
        console.log('🔌 Disconnecting and resetting state...');
        
        try {
            // Stop timeout timer
            this.stopTimeoutTimer();
            
            // Stop block subscriptions
            this.chainManager.stopBlockSubscription();
            
            // Stop account balance updates
            this.accountManager.stopBalanceUpdates();
            
            // Reset game state
            this.gameManager.resetGame();
            
            // Reset matchmaking
            this.matchmakingManager.setInQueue(false);
            
            // Clear transaction history
            this.transactionManager.clearHistory();
            
            // Disconnect from chain
            if (this.chainManager.api) {
                await this.chainManager.api.disconnect();
                this.chainManager.api = null;
            }
            
            // Reset UI
            this.uiManager.hideGameBoard();
            this.uiManager.hideGameMessage();
            this.uiManager.hideMatchmakingWaiting();
            this.uiManager.hideTimeoutSection();
            this.uiManager.hideAccountInfo();
            this.uiManager.hideGameWaitingOverlay();
            this.uiManager.renderTransactionHistory([]);
            this.uiManager.updatePendingCount(0);
            this.uiManager.updateChart([]);
            this.uiManager.updateTransactionStats(null);
            
            // Disable wallet button
            this.uiManager.elements.connectWalletBtn.disabled = true;
            this.uiManager.elements.connectWalletBtn.classList.add('disabled');
            
            console.log('✅ Disconnected and reset complete');
            
        } catch (error) {
            console.error('Error during disconnect:', error);
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

            // Auto-mint if balance is 0
            await this.checkAndMintFunds(balance);

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

            // 🎵 Play matchmaking sound
            this.soundManager.playMatchmakingSound();

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

    async checkAndMintFunds(balance) {
        if (!this.chainManager.isConnected() || !this.accountManager.isConnected()) {
            return;
        }

        try {
            // Parse balance string (e.g., "0.0000 UNIT" -> 0)
            const balanceValue = parseFloat(balance);
            
            if (isNaN(balanceValue) || balanceValue === 0) {
                console.log('💰 Balance is 0, minting funds...');
                
                const txData = this.transactionManager.createTransaction(
                    'mint_funds',
                    this.accountManager.getAddress(),
                    'Tic-Tac-Toe Pallet',
                    'Mint 1000 UNIT'
                );

                // Mint 1000 UNIT (convert to smallest unit based on chain decimals)
                const decimals = this.chainManager.api.registry.chainDecimals[0] || 12;
                const amount = 1000 * Math.pow(10, decimals);
                
                const tx = this.chainManager.api.tx.ticTacToe.mintFunds(this.accountManager.currentAccount.address, amount);
                
                const unsub = await this.accountManager.sendUnsigned(tx, async (result) => {
                    await this.handleTransactionStatus(result, txData, unsub);
                });

                // // Wait a moment and refresh balance
                // setTimeout(async () => {
                //     const newBalance = await this.accountManager.getBalance();
                //     this.uiManager.updateBalance(newBalance);
                //     console.log('💰 New balance:', newBalance);
                // }, 2000);
            }
        } catch (error) {
            console.error('Error checking/minting funds:', error);
            // Don't alert, just log the error
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
            // Show waiting overlay - disable board interaction
            this.uiManager.showGameWaitingOverlay();
            
            // 🎵 Play move sound
            this.soundManager.playMoveSound();
            
            const tx = await this.gameManager.makeMove(cellIndex);
            const txData = this.transactionManager.createTransaction(
                'game_move',
                this.accountManager.getAddress(),
                `Game #${gameInfo.currentGameId}`,
                `Move at [${cellIndex}]`
            );

            const unsub = await this.accountManager.signAndSend(tx, async (result) => {
                await this.handleTransactionStatus(result, txData, unsub);
                
                // When transaction is in block, hide overlay
                // Timer will be managed by moveMade event handler based on actual game state
                if (result.status.isInBlock) {
                    this.uiManager.hideGameWaitingOverlay();
                }
                
                // Also hide overlay on finalized (belt and suspenders)
                if (result.status.isFinalized) {
                    this.uiManager.hideGameWaitingOverlay();
                }
            });

        } catch (error) {
            console.error('Move error:', error);
            this.uiManager.hideGameWaitingOverlay(); // Hide overlay on error
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
        this.uiManager.updateBoardFromState({ board: Array(9).fill(null) });
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
            
            // 🎵 Play tick sound for last 10 seconds
            if (remaining <= 10 && remaining > 0) {
                this.soundManager.playTimeoutWarning();
            }
            
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
                    
                    // 🎵 Play game start sound
                    this.soundManager.playGameStartSound();
                    
                    // Show the game UI
                    const gameState = this.gameManager.gameState;
                    if (gameState.gameId !== null) {
                        this.uiManager.showGameBoard();
                        this.uiManager.updateGameInfo(gameState.gameId, gameState.playerX, gameState.playerO);
                        
                        // Start timeout timer if it's opponent's turn AND game hasn't ended
                        if (!gameState.isMyTurn && !gameState.isEnded) {
                            this.startTimeoutTimer();
                        }
                    }
                }
                break;

            case 'moveMade':
                // Update timeout timer based on whose turn it is
                const gameState = this.gameManager.gameState;
                
                // Don't start timer if game has ended
                if (gameState.isEnded) {
                    console.log('Game has ended, not starting timeout timer');
                    this.stopTimeoutTimer();
                    break;
                }
                
                if (gameState.isMyTurn) {
                    console.log('It\'s my turn, stopping timeout');
                    this.stopTimeoutTimer();
                } else {
                    console.log('It\'s opponent\'s turn, starting timeout');
                    // 🎵 Play opponent turn sound
                    this.soundManager.playOpponentTurnSound();
                    this.startTimeoutTimer();
                }
                break;

            case 'gameEnded':
                this.stopTimeoutTimer();
                
                // Show end message
                const endResult = this.gameManager.handleGameEnd(data.state);
                
                // 🎵 Play win or lose sound based on result
                if (endResult.winnerType === 'winner') {
                    this.soundManager.playWinSound();
                } else if (endResult.winnerType === 'loser') {
                    this.soundManager.playLoseSound();
                }
                
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
                } else if (!gameState.isEnded) {
                    // Only start timer if game hasn't ended
                    this.startTimeoutTimer();
                }
            }
            
            const finalGameInfo = this.gameManager.getGameInfo();
            console.log('Game setup complete. Final game state:', finalGameInfo);
            
            // Verify the game is properly initialized
            if (!finalGameInfo.gameActive) {
                console.error('WARNING: Game is not active after setup!');
                console.error('Final state:', finalGameInfo);
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
        }

        if (status.isFinalized) {
            txData.timing.finalized = Date.now();
            txData.statusText = 'Finalized ✓';
            txData.finalizedBlockHash = status.asFinalized.toHex();
            this.updateTransactionUI(txData);
            
            // Unsubscribe after finalization
            unsub();
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
        
        // Update chart and stats
        this.uiManager.updateChart(history);
        const stats = this.transactionManager.calculateStats();
        this.uiManager.updateTransactionStats(stats);
    }

    handleToggleSound() {
        const isEnabled = this.soundManager.toggleEnabled();
        const soundOnIcon = document.getElementById('soundOnIcon');
        const soundOffIcon = document.getElementById('soundOffIcon');
        
        if (isEnabled) {
            soundOnIcon.style.display = 'block';
            soundOffIcon.style.display = 'none';
            console.log('🔊 Sound enabled');
        } else {
            soundOnIcon.style.display = 'none';
            soundOffIcon.style.display = 'block';
            console.log('🔇 Sound disabled');
        }
    }
}

