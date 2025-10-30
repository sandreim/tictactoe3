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
        
        if (gameState.isEnded === true) {
            playerIndicator.textContent = `Game over`;
        } else {
            // Show player symbol and turn status
            playerIndicator.textContent = gameState.isMyTurn 
                ? `You are ${gameState.playerSymbol} - Your turn!`
                : `You are ${gameState.playerSymbol} - Opponent's turn...`;
        }
        
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
            
            // Transaction Chart & Stats
            timingChart: document.getElementById('timingChart'),
            statsContent: document.getElementById('statsContent'),
            minReady: document.getElementById('minReady'),
            maxReady: document.getElementById('maxReady'),
            avgReady: document.getElementById('avgReady'),
            minInBlock: document.getElementById('minInBlock'),
            maxInBlock: document.getElementById('maxInBlock'),
            avgInBlock: document.getElementById('avgInBlock'),
            minFinalized: document.getElementById('minFinalized'),
            maxFinalized: document.getElementById('maxFinalized'),
            avgFinalized: document.getElementById('avgFinalized'),

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
        this.elements.accountBalance.textContent = `Balance: ${balance.free} UNIT`;
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
        
        // Get current player address to highlight "YOU"
        const currentAddress = this.gameManager.accountManager.getAddress();
        
        // Format player X
        const playerXText = playerX === currentAddress 
            ? `YOU (${this.shortenAddress(playerX)})`
            : this.shortenAddress(playerX);
        
        // Format player O
        const playerOText = playerO === currentAddress 
            ? `YOU (${this.shortenAddress(playerO)})`
            : this.shortenAddress(playerO);
        
        this.elements.playerXAddress.textContent = playerXText;
        this.elements.playerOAddress.textContent = playerOText;
        this.elements.gameIdDisplay.classList.remove('hidden');
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

    // Transaction Chart & Stats
    initializeChart() {
        if (this.chart) {
            console.log('Chart already initialized');
            return;
        }
        
        if (!this.elements.timingChart) {
            console.error('Chart canvas element not found');
            return;
        }
        
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded yet');
            return;
        }
        
        try {
            console.log('Initializing transaction timing chart...');
            const ctx = this.elements.timingChart.getContext('2d');
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Ready',
                            data: [],
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 2,
                            tension: 0.1,
                            spanGaps: true // Connect points even with null values
                        },
                        {
                            label: 'InBlock',
                            data: [],
                            borderColor: 'rgb(255, 159, 64)',
                            backgroundColor: 'rgba(255, 159, 64, 0.2)',
                            borderWidth: 2,
                            tension: 0.1,
                            spanGaps: true
                        },
                        {
                            label: 'Finalized',
                            data: [],
                            borderColor: 'rgb(153, 102, 255)',
                            backgroundColor: 'rgba(153, 102, 255, 0.2)',
                            borderWidth: 2,
                            tension: 0.1,
                            spanGaps: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#c5d9c5'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Transaction Timing (ms)',
                            color: '#c5d9c5'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#c5d9c5'
                            },
                            grid: {
                                color: 'rgba(197, 217, 197, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#c5d9c5'
                            },
                            grid: {
                                color: 'rgba(197, 217, 197, 0.1)'
                            }
                        }
                    }
                }
            });
            console.log('✅ Chart initialized successfully');
        } catch (error) {
            console.error('Failed to initialize chart:', error);
            this.chart = null;
        }
    }

    updateChart(transactions) {
        console.log('📊 updateChart called with', transactions.length, 'transactions');
        
        if (!this.chart) {
            console.log('Chart not initialized, initializing now...');
            this.initializeChart();
        }

        if (!this.chart) {
            console.warn('Chart initialization failed, cannot update');
            return; // Chart initialization failed
        }

        // Show all transactions that have at least started (have ready timing)
        const validTxs = transactions
            .filter(tx => tx.timing.ready) // At least have ready timing
            .slice(0, 20) // Show last 20 transactions
            .reverse(); // Oldest first for chart

        console.log('Found', validTxs.length, 'transactions with timing data for chart');

        if (validTxs.length === 0) {
            console.log('No transactions with timing data to display');
            // Clear chart
            this.chart.data.labels = [];
            this.chart.data.datasets[0].data = [];
            this.chart.data.datasets[1].data = [];
            this.chart.data.datasets[2].data = [];
            this.chart.update();
            return;
        }

        const labels = validTxs.map((_, index) => `TX ${index + 1}`);
        
        // Calculate timing deltas, use null for missing data
        const readyData = validTxs.map(tx => 
            tx.timing.ready ? tx.timing.ready - tx.timing.submitted : null
        );
        const inBlockData = validTxs.map(tx => 
            tx.timing.inBlock ? tx.timing.inBlock - tx.timing.submitted : null
        );
        const finalizedData = validTxs.map(tx => 
            tx.timing.finalized ? tx.timing.finalized - tx.timing.submitted : null
        );

        console.log('Chart data:', { 
            labels, 
            ready: readyData.filter(x => x !== null).length + ' values',
            inBlock: inBlockData.filter(x => x !== null).length + ' values',
            finalized: finalizedData.filter(x => x !== null).length + ' values'
        });

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = readyData;
        this.chart.data.datasets[1].data = inBlockData;
        this.chart.data.datasets[2].data = finalizedData;
        this.chart.update();
        
        console.log('✅ Chart updated');
    }

    updateTransactionStats(stats) {
        console.log('📈 updateTransactionStats called with:', stats);
        
        if (!stats) {
            console.log('No stats available, hiding stats section');
            this.elements.statsContent.classList.add('hidden');
            return;
        }

        this.elements.statsContent.classList.remove('hidden');

        // Helper to format stats value
        const formatStat = (value, count) => {
            if (count === 0) return '-';
            return `${Math.round(value)}ms`;
        };

        // Update Ready stats
        this.elements.minReady.textContent = formatStat(stats.ready.min, stats.ready.count);
        this.elements.maxReady.textContent = formatStat(stats.ready.max, stats.ready.count);
        this.elements.avgReady.textContent = formatStat(stats.ready.avg, stats.ready.count);

        // Update InBlock stats
        this.elements.minInBlock.textContent = formatStat(stats.inBlock.min, stats.inBlock.count);
        this.elements.maxInBlock.textContent = formatStat(stats.inBlock.max, stats.inBlock.count);
        this.elements.avgInBlock.textContent = formatStat(stats.inBlock.avg, stats.inBlock.count);

        // Update Finalized stats
        this.elements.minFinalized.textContent = formatStat(stats.finalized.min, stats.finalized.count);
        this.elements.maxFinalized.textContent = formatStat(stats.finalized.max, stats.finalized.count);
        this.elements.avgFinalized.textContent = formatStat(stats.finalized.avg, stats.finalized.count);
        
        console.log('✅ Stats updated:', {
            ready: stats.ready.count,
            inBlock: stats.inBlock.count,
            finalized: stats.finalized.count
        });
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

