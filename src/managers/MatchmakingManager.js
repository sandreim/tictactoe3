export class MatchmakingManager {
    constructor(chainManager, accountManager) {
        this.chainManager = chainManager;
        this.accountManager = accountManager;
        this.inQueue = false;
    }

    async joinQueue() {
        if (!this.chainManager.api || !this.accountManager.isConnected()) {
            throw new Error('Not connected to chain or wallet');
        }

        console.log('Joining matchmaking queue...');
        this.inQueue = true;

        const tx = this.chainManager.api.tx.ticTacToe.playGame();
        return tx;
    }

    async cancelQueue() {
        if (!this.chainManager.api || !this.accountManager.isConnected()) {
            throw new Error('Not connected to chain or wallet');
        }

        console.log('Canceling matchmaking...');
        this.inQueue = false;

        const tx = this.chainManager.api.tx.ticTacToe.cancelMatchmaking();
        return tx;
    }

    isInQueue() {
        return this.inQueue;
    }

    setInQueue(value) {
        this.inQueue = value;
    }

    /**
     * Check if player is in the matchmaking queue on-chain
     */
    async isPlayerInQueue() {
        if (!this.chainManager.api || !this.accountManager.isConnected()) {
            return false;
        }

        try {
            const queue = await this.chainManager.api.query.ticTacToe.matchmakingQueue();
            const playerAddress = this.accountManager.getAddress();
            
            // Check if player is in the queue
            const isInQueue = queue.some(addr => addr.toString() === playerAddress);
            
            // Update local state
            this.inQueue = isInQueue;
            
            console.log('Player in queue:', isInQueue);
            return isInQueue;
        } catch (error) {
            console.error('Error checking queue status:', error);
            return false;
        }
    }
}

