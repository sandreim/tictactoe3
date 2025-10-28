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
        const transactions = this.transactionHistory.filter(tx => 
            tx.status === 'success' && tx.timing.ready && tx.timing.inBlock && tx.timing.finalized
        );

        if (transactions.length === 0) {
            return null;
        }

        const readyTimes = [];
        const inBlockTimes = [];
        const finalizedTimes = [];

        transactions.forEach(tx => {
            const ready = tx.timing.ready - tx.timing.submitted;
            const inBlock = tx.timing.inBlock - tx.timing.submitted;
            const finalized = tx.timing.finalized - tx.timing.submitted;

            readyTimes.push(ready);
            inBlockTimes.push(inBlock);
            finalizedTimes.push(finalized);
        });

        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        const min = arr => Math.min(...arr);
        const max = arr => Math.max(...arr);

        return {
            ready: {
                min: min(readyTimes),
                max: max(readyTimes),
                avg: avg(readyTimes)
            },
            inBlock: {
                min: min(inBlockTimes),
                max: max(inBlockTimes),
                avg: avg(inBlockTimes)
            },
            finalized: {
                min: min(finalizedTimes),
                max: max(finalizedTimes),
                avg: avg(finalizedTimes)
            }
        };
    }
}

