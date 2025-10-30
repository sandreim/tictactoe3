export class TransactionManager {
    constructor() {
        this.transactionHistory = [];
        this.pendingTransactions = new Map();
        this.timingChart = null;
    }

    createTransaction(type, from, to, amount) {
        const txId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const txData = {
            id: txId,
            from,
            to,
            amount,
            status: 'pending',
            statusText: 'Signing...',
            hash: null,
            blockHash: null,
            timing: {
                submitted: Date.now(),
                ready: null,
                broadcast: null,
                inBlock: null,
                finalized: null,
                invalid: null
            }
        };

        return txData;
    }

    addToHistory(txData) {
        // Add to start of array
        this.transactionHistory.unshift(txData);
        
        // Keep only last 50 transactions
        if (this.transactionHistory.length > 50) {
            this.transactionHistory = this.transactionHistory.slice(0, 50);
        }

        // Track if pending
        if (txData.status === 'pending' && txData.hash) {
            this.pendingTransactions.set(txData.hash, txData);
        }

        return this.transactionHistory;
    }

    updateInHistory(hashOrId, updates) {
        // Find by hash or id
        const tx = this.transactionHistory.find(t => t.hash === hashOrId || t.id === hashOrId);
        if (tx) {
            Object.assign(tx, updates);
            
            // Remove from pending if no longer pending
            if (updates.status !== 'pending' && tx.hash) {
                this.pendingTransactions.delete(tx.hash);
            }
        }
        
        return this.transactionHistory;
    }

    clearHistory() {
        this.transactionHistory = [];
        this.pendingTransactions.clear();
    }

    getHistory() {
        return this.transactionHistory;
    }

    getPendingCount() {
        return this.pendingTransactions.size;
    }

    calculateStats() {
        console.log('Calculating stats from', this.transactionHistory.length, 'total transactions');
        
        const readyTimes = [];
        const inBlockTimes = [];
        const finalizedTimes = [];

        // Collect timing data for each state independently
        this.transactionHistory.forEach(tx => {
            if (tx.timing.ready) {
                readyTimes.push(tx.timing.ready - tx.timing.submitted);
            }
            if (tx.timing.inBlock) {
                inBlockTimes.push(tx.timing.inBlock - tx.timing.submitted);
            }
            if (tx.timing.finalized) {
                finalizedTimes.push(tx.timing.finalized - tx.timing.submitted);
            }
        });

        console.log('Stats data:', {
            ready: readyTimes.length,
            inBlock: inBlockTimes.length,
            finalized: finalizedTimes.length
        });

        // Return null if no timing data at all
        if (readyTimes.length === 0 && inBlockTimes.length === 0 && finalizedTimes.length === 0) {
            console.log('No timing data available for stats');
            return null;
        }

        const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const min = arr => arr.length > 0 ? Math.min(...arr) : 0;
        const max = arr => arr.length > 0 ? Math.max(...arr) : 0;

        return {
            ready: {
                min: min(readyTimes),
                max: max(readyTimes),
                avg: avg(readyTimes),
                count: readyTimes.length
            },
            inBlock: {
                min: min(inBlockTimes),
                max: max(inBlockTimes),
                avg: avg(inBlockTimes),
                count: inBlockTimes.length
            },
            finalized: {
                min: min(finalizedTimes),
                max: max(finalizedTimes),
                avg: avg(finalizedTimes),
                count: finalizedTimes.length
            }
        };
    }
}

