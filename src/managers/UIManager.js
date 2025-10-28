export class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.elements = this.cacheElements();
        
        // Listen to game state changes and update ALL game UI automatically
        this.gameManager.gameState.onStateChange((gameState) => {
            this.updateGameUI(gameState);
        });
    }
    
    /**
     * Central method to update ALL game UI based on game state
     * This is the SINGLE place where UI updates happen driven by state changes
     */
    updateGameUI(gameState) {
        console.log('🎨 updateGameUI called with state:', gameState.toJSON());
        
        if (gameState.gameId === null || gameState.gameId === undefined) {
            console.log('No game ID, skipping UI update');
            return;
        }
        
        // Always update board (even when game ended) to show final state
        this.updateBoardFromState(gameState);
        
        // Only update turn indicator if game is still active
        this.updatePlayerTurnFromState(gameState);
        
        console.log('✅ UI update complete');
    }
    
    /**
     * Update board display from game state
     */
    updateBoardFromState(gameState) {
        const board = gameState.board;
        console.log('Updating board from state:', board);
        
        board.forEach((cell, index) => {
            const cellElement = document.querySelector(`[data-cell="${index}"]`);
            if (!cellElement) {
                console.error(`Cell element not found for index ${index}`);
                return;
            }
            cellElement.textContent = '';
            cellElement.classList.remove('taken', 'x', 'o');
            
            if (cell === 'X') {
                cellElement.textContent = 'X';
                cellElement.classList.add('taken', 'x');
            } else if (cell === 'O') {
                cellElement.textContent = 'O';
                cellElement.classList.add('taken', 'o');
            }
        });
    }
    
    /**
     * Update player turn indicator from game state
     */
    updatePlayerTurnFromState(gameState) {
        console.log('📝 updatePlayerTurnFromState called with:', {
            playerSymbol: gameState.playerSymbol,
            isMyTurn: gameState.isMyTurn,
            isActive: gameState.isActive,
            isEnded: gameState.isEnded
        });
        
        const playerIndicator = this.elements.currentPlayer;
        
        if (!playerIndicator) {
            console.error('❌ Player indicator element not found!');
            return;
        }
        
        if (!gameState.playerSymbol) {
            console.warn('⚠️ Player symbol not set');
            return;
        }
        
        // Show player symbol and turn status
        const newText = gameState.isMyTurn 
            ? `You are ${gameState.playerSymbol} - Your turn!`
            : `You are ${gameState.playerSymbol} - Opponent's turn...`;
        
        console.log(`  Old text: "${playerIndicator.textContent}"`);
        console.log(`  New text: "${newText}"`);
        
        playerIndicator.textContent = newText;
        playerIndicator.className = `player-indicator player-${gameState.playerSymbol.toLowerCase()}`;
        
        console.log('✅ Player turn updated successfully');
    }

    cacheElements() {
        return {
            // Connection
            rpcUrl: document.getElementById('rpcUrl'),
            connectBtn: document.getElementById('connectBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            chainInfo: document.getElementById('chainInfo'),
            chainName: document.getElementById('chainName'),
            chainVersion: document.getElementById('chainVersion'),

            // Account
            connectWalletBtn: document.getElementById('connectWalletBtn'),
            useSeedBtn: document.getElementById('useSeedBtn'),
            seedInput: document.getElementById('seedInput'),
            seedPhrase: document.getElementById('seedPhrase'),
            importSeedBtn: document.getElementById('importSeedBtn'),
            cancelSeedBtn: document.getElementById('cancelSeedBtn'),
            accountType: document.getElementById('accountType'),
            accountInfo: document.getElementById('accountInfo'),
            accountAddress: document.getElementById('accountAddress'),
            accountBalance: document.getElementById('accountBalance'),

            // Matchmaking
            playGameBtn: document.getElementById('playGameBtn'),
            cancelMatchmakingBtn: document.getElementById('cancelMatchmakingBtn'),
            matchmakingStatus: document.getElementById('matchmakingStatus'),

            // Game
            gameBoard: document.getElementById('gameBoard'),
            gameBoardContainer: document.getElementById('gameBoardContainer'),
            gameModeSection: document.getElementById('gameModeSection'),
            gameIdDisplay: document.getElementById('gameIdDisplay'),
            gameIdValue: document.getElementById('gameIdValue'),
            playerXAddress: document.getElementById('playerXAddress'),
            playerOAddress: document.getElementById('playerOAddress'),
            gameInfoSection: document.getElementById('gameInfoSection'),
            currentPlayer: document.getElementById('currentPlayer'),
            gameMessage: document.getElementById('gameMessage'),
            resetGameBtn: document.getElementById('resetGameBtn'),
            gameStatsBottom: document.getElementById('gameStatsBottom'),
            xWins: document.getElementById('xWins'),
            oWins: document.getElementById('oWins'),
            draws: document.getElementById('draws'),
            
            // Timeout
            timeoutSection: document.getElementById('timeoutSection'),
            timeoutTimer: document.getElementById('timeoutTimer'),
            timeoutCountdown: document.getElementById('timeoutCountdown'),
            claimTimeoutBtn: document.getElementById('claimTimeoutBtn'),

            // Transactions
            transactionHistory: document.getElementById('transactionHistory'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            pendingCount: document.getElementById('pendingCount'),

            // Blocks
            blockBanner: document.getElementById('blockBanner'),
            blockWindow: document.getElementById('blockWindow'),
        };
    }

    // Connection UI
    updateConnectionStatus(connected, message) {
        this.elements.statusText.textContent = message;
        if (connected) {
            this.elements.statusIndicator.classList.add('connected');
        } else {
            this.elements.statusIndicator.classList.remove('connected');
        }
    }

    showChainInfo(chain, version) {
        this.elements.chainName.textContent = chain;
        this.elements.chainVersion.textContent = version;
        this.elements.chainInfo.classList.remove('hidden');
    }

    hideChainInfo() {
        this.elements.chainInfo.classList.add('hidden');
    }

    // Account UI
    showSeedInput() {
        this.elements.seedInput.classList.remove('hidden');
    }

    hideSeedInput() {
        this.elements.seedInput.classList.add('hidden');
        this.elements.seedPhrase.value = '';
    }

    updateAccountInfo(address, accountType) {
        this.elements.accountAddress.textContent = address;
        this.elements.accountType.textContent = accountType === 'seed' ? '🔑 Seed Account' : '🦊 Extension Account';
        this.elements.accountInfo.classList.remove('hidden');
    }

    updateBalance(balance) {
        this.elements.accountBalance.textContent = `Balance: ${balance.free}`;
    }

    hideAccountInfo() {
        this.elements.accountInfo.classList.add('hidden');
    }

    // Matchmaking UI
    showMatchmakingWaiting() {
        this.elements.playGameBtn.classList.add('hidden');
        this.elements.cancelMatchmakingBtn.classList.remove('hidden');
        this.elements.matchmakingStatus.classList.remove('hidden');
    }

    hideMatchmakingWaiting() {
        this.elements.playGameBtn.classList.remove('hidden');
        this.elements.playGameBtn.disabled = false;
        this.elements.playGameBtn.textContent = 'START GAME';
        this.elements.cancelMatchmakingBtn.classList.add('hidden');
        this.elements.matchmakingStatus.classList.add('hidden');
    }

    // Game UI
    showGameBoard() {
        this.elements.gameBoardContainer.classList.remove('hidden');
        this.elements.gameInfoSection.classList.remove('hidden');
        this.elements.gameStatsBottom.classList.remove('hidden');
        this.elements.gameModeSection.style.display = 'none';
    }

    hideGameBoard() {
        this.elements.gameBoardContainer.classList.add('hidden');
        this.elements.gameInfoSection.classList.add('hidden');
        this.elements.gameStatsBottom.classList.add('hidden');
        this.elements.gameIdDisplay.classList.add('hidden');
        this.elements.gameModeSection.style.display = 'block';
    }

    updateGameInfo(gameId, playerX, playerO) {
        this.elements.gameIdValue.textContent = gameId;
        this.elements.playerXAddress.textContent = playerX;
        this.elements.playerOAddress.textContent = playerO;
        this.elements.gameIdDisplay.classList.remove('hidden');
    }

    /**
     * @deprecated Use updateGameUI() instead - called automatically by game state changes
     */
    updateBoard(board) {
        console.warn('⚠️ updateBoard() is deprecated - UI updates automatically from game state');
        // Keep for backward compatibility but don't use
        this.updateBoardFromState({ board });
    }


    showGameEndMessage(message, winnerType) {
        this.elements.gameMessage.textContent = message;
        this.elements.gameMessage.className = `game-message ${winnerType}`;
        this.elements.gameMessage.classList.remove('hidden');
    }

    hideGameMessage() {
        this.elements.gameMessage.classList.add('hidden');
    }

    updateGameStats(stats) {
        this.elements.xWins.textContent = stats.xWins;
        this.elements.oWins.textContent = stats.oWins;
        this.elements.draws.textContent = stats.draws;
    }

    // Timeout UI
    showTimeoutSection() {
        this.elements.timeoutSection.classList.remove('hidden');
    }

    hideTimeoutSection() {
        this.elements.timeoutSection.classList.add('hidden');
    }

    updateTimeoutCountdown(seconds) {
        this.elements.timeoutCountdown.textContent = seconds;
    }

    showClaimTimeoutBtn() {
        this.elements.claimTimeoutBtn.classList.remove('hidden');
    }

    hideClaimTimeoutBtn() {
        this.elements.claimTimeoutBtn.classList.add('hidden');
    }

    // Transaction UI
    renderTransactionHistory(transactions) {
        if (transactions.length === 0) {
            this.elements.transactionHistory.innerHTML = '<p class="no-transactions">No transactions yet. Send your first transaction to see it here!</p>';
            return;
        }

        this.elements.transactionHistory.innerHTML = transactions.map(tx => {
            const statusClass = tx.status;
            const timingInfo = this.formatTiming(tx.timing);

            return `
                <div class="tx-item ${statusClass}">
                    <div class="tx-header">
                        <div class="tx-status">${tx.statusText}</div>
                        <div class="tx-time">${new Date(tx.timing.submitted).toLocaleTimeString()}</div>
                    </div>
                    <div class="tx-details">
                        <div><strong>From:</strong> ${this.shortenAddress(tx.from)}</div>
                        <div><strong>To:</strong> ${tx.to}</div>
                        <div><strong>Action:</strong> ${tx.amount}</div>
                        ${tx.hash ? `<div><strong>Hash:</strong> <span class="tx-hash">${this.shortenHash(tx.hash)}</span></div>` : ''}
                    </div>
                    ${timingInfo ? `<div class="tx-timing">${timingInfo}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    updatePendingCount(count) {
        if (count > 0) {
            this.elements.pendingCount.textContent = `⏳ ${count} pending`;
            this.elements.pendingCount.classList.remove('hidden');
        } else {
            this.elements.pendingCount.classList.add('hidden');
        }
    }

    // Block UI
    showBlockBanner() {
        this.elements.blockBanner.classList.remove('hidden');
    }

    updateBlockWindow(blockWindow, finalizedBlockNumber) {
        this.elements.blockWindow.innerHTML = blockWindow.map(block => {
            const isFinalized = block.number <= finalizedBlockNumber;
            return `
                <div class="block-item ${isFinalized ? 'finalized' : ''} new-block">
                    <div class="block-number">#${block.number}</div>
                    <div class="block-hash-short">${block.hash.slice(0, 8)}...</div>
                </div>
            `;
        }).join('');
    }

    // Helpers
    shortenAddress(address) {
        if (!address) return '-';
        if (address.length < 16) return address;
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }

    shortenHash(hash) {
        if (!hash) return '-';
        return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    }

    formatTiming(timing) {
        const parts = [];
        if (timing.ready) {
            parts.push(`Ready: ${timing.ready - timing.submitted}ms`);
        }
        if (timing.inBlock) {
            parts.push(`InBlock: ${timing.inBlock - timing.submitted}ms`);
        }
        if (timing.finalized) {
            parts.push(`Finalized: ${timing.finalized - timing.submitted}ms`);
        }
        return parts.join(' | ');
    }
}

