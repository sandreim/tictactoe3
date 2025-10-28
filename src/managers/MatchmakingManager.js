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
}

