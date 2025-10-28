import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { formatBalance } from '@polkadot/util';

export class AccountManager {
    constructor(chainManager) {
        this.chainManager = chainManager;
        this.currentAccount = null;
        this.keyring = null;
        this.keyringPair = null;
        this.accountType = null; // 'extension' or 'seed'
        this.accountUpdateInterval = null;
        this.lastAccountUpdate = 0;
        this.accountUpdateThrottle = 3000;
    }

    async connectWallet() {
        try {
            // Enable web3
            const extensions = await web3Enable('Polkadot Tic-Tac-Toe');
            
            if (extensions.length === 0) {
                throw new Error('No extension installed. Please install Polkadot.js extension.');
            }

            // Get all accounts
            const accounts = await web3Accounts();
            
            if (accounts.length === 0) {
                throw new Error('No accounts found. Please create an account in your Polkadot.js extension.');
            }

            // Use first account
            this.currentAccount = accounts[0];
            this.accountType = 'extension';
            
            return this.currentAccount;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw error;
        }
    }

    async createFromSeed(seedPhrase) {
        try {
            await cryptoWaitReady();

            if (!this.keyring) {
                this.keyring = new Keyring({ type: 'sr25519' });
            }

            // Create a key pair from the provided string (seed phrase)
            // This uses the Polkadot.js Keyring's addFromUri, which accepts a string (mnemonic, hex, or raw seed)
            this.keyringPair = this.keyring.addFromUri(seedPhrase);
            
            this.currentAccount = {
                address: this.keyringPair.address,
                meta: {
                    name: 'Seed Account',
                    source: 'seed'
                }
            };
            this.accountType = 'seed';

            return this.currentAccount;
        } catch (error) {
            console.error('Error creating account from seed:', error);
            throw error;
        }
    }

    async getBalance() {
        if (!this.currentAccount || !this.chainManager.api) {
            return null;
        }

        const { data: balance } = await this.chainManager.api.query.system.account(this.currentAccount.address);
        
        return {
            free: formatBalance(balance.free, { withSi: true, forceUnit: '-' }),
            reserved: formatBalance(balance.reserved, { withSi: true, forceUnit: '-' }),
            frozen: formatBalance(balance.frozen, { withSi: true, forceUnit: '-' })
        };
    }

    startBalanceUpdates(callback) {
        this.accountUpdateInterval = setInterval(async () => {
            const now = Date.now();
            if (now - this.lastAccountUpdate >= this.accountUpdateThrottle) {
                this.lastAccountUpdate = now;
                try {
                    const balance = await this.getBalance();
                    callback(balance);
                } catch (error) {
                    console.error('Error updating balance:', error);
                }
            }
        }, this.accountUpdateThrottle);
    }

    stopBalanceUpdates() {
        if (this.accountUpdateInterval) {
            clearInterval(this.accountUpdateInterval);
            this.accountUpdateInterval = null;
        }
    }

    async signAndSend(tx, callback) {
        if (this.accountType === 'seed') {
            return await tx.signAndSend(this.keyringPair, callback);
        } else {
            const injector = await web3FromAddress(this.currentAccount.address);
            return await tx.signAndSend(
                this.currentAccount.address,
                { signer: injector.signer },
                callback
            );
        }
    }

    disconnect() {
        this.stopBalanceUpdates();
        this.currentAccount = null;
        this.accountType = null;
        this.keyringPair = null;
    }

    isConnected() {
        return this.currentAccount !== null;
    }

    getAddress() {
        return this.currentAccount?.address || null;
    }
}

