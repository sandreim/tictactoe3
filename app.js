import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { formatBalance } from '@polkadot/util';
import { Keyring } from '@polkadot/keyring';
import { mnemonicValidate, mnemonicToMiniSecret, cryptoWaitReady } from '@polkadot/util-crypto';

class PolkadotApp {
    constructor() {
        this.api = null;
        this.currentAccount = null;
        this.keyring = null;
        this.keyringPair = null; // For seed-based accounts
        this.accountType = null; // 'extension' or 'seed'
        this.unsubscribeBlocks = null;
        this.accountUpdateInterval = null;
        this.lastAccountUpdate = 0;
        this.accountUpdateThrottle = 3000; // Throttle updates to every 3 seconds max
        this.followBestBlock = true; // Default to following best blocks
        this.statusTimeout = null; // Track status message timeouts
        this.transactionHistory = []; // Store transaction history
        this.pendingTransactions = new Map(); // Track in-flight transactions by hash
        this.timingChart = null; // Chart.js instance
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Connection button
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.connectToChain();
        });

        // Wallet connection button
        document.getElementById('connectWalletBtn').addEventListener('click', () => {
            this.connectWallet();
        });

        // Transaction button
        document.getElementById('sendTransactionBtn').addEventListener('click', () => {
            this.sendTransaction();
        });

        // Auto-validate recipient address
        document.getElementById('recipientAddress').addEventListener('input', () => {
            this.validateTransactionForm();
        });

        document.getElementById('transferAmount').addEventListener('input', () => {
            this.validateTransactionForm();
        });

        // Update mode toggle
        document.getElementById('updateModeToggle').addEventListener('change', (e) => {
            this.toggleUpdateMode(e.target.checked);
        });

        // Clear history button
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearTransactionHistory();
        });

        // Seed phrase buttons
        document.getElementById('useSeedBtn').addEventListener('click', () => {
            this.showSeedInput();
        });

        document.getElementById('importSeedBtn').addEventListener('click', () => {
            this.importFromSeed();
        });

        document.getElementById('cancelSeedBtn').addEventListener('click', () => {
            this.hideSeedInput();
        });
    }

    async connectToChain() {
        const rpcUrl = document.getElementById('rpcUrl').value.trim();
        const connectBtn = document.getElementById('connectBtn');
        
        if (!rpcUrl) {
            this.showError('Please enter a valid RPC URL');
            return;
        }

        try {
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;

            // Disconnect existing connection
            if (this.api) {
                await this.api.disconnect();
                this.stopAccountUpdates();
            }

            // Create new connection
            const provider = new WsProvider(rpcUrl);
            this.api = await ApiPromise.create({ 
                provider,
                noInitWarn: true
            });
            
            // Ensure API is ready
            await this.api.isReady;

            // Get chain information
            const [chain, version] = await Promise.all([
                this.api.rpc.system.chain(),
                this.api.rpc.system.version()
            ]);

            // Update UI
            this.updateConnectionStatus(true, `Connected to ${chain}`);
            this.updateChainInfo(chain.toString(), version.toString());
            
            // Start monitoring blocks
            this.subscribeToBlocks();

            connectBtn.textContent = 'Connected';
            connectBtn.disabled = false;

        } catch (error) {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false, 'Connection failed');
            this.showError(`Failed to connect: ${error.message}`);
            connectBtn.textContent = 'Connect';
            connectBtn.disabled = false;
        }
    }

    async connectWallet() {
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        
        try {
            connectWalletBtn.textContent = 'Connecting...';
            connectWalletBtn.disabled = true;

            // Enable the extension
            const extensions = await web3Enable('Polkadot Parachain Explorer');
            
            if (extensions.length === 0) {
                throw new Error('No Polkadot extension found. Please install Polkadot{.js} extension.');
            }

            // Get accounts
            const accounts = await web3Accounts();
            
            if (accounts.length === 0) {
                throw new Error('No accounts found. Please create an account in your Polkadot extension.');
            }

            // Use the first account
            this.currentAccount = accounts[0];
            this.accountType = 'extension';
            
            // Update UI
            this.updateAccountInfo();
            connectWalletBtn.textContent = 'Connected';
            
            // Update account type display
            document.getElementById('accountType').textContent = '🔌 Extension Wallet';
            
            // Start periodic account updates
            this.startAccountUpdates();
            
            // Validate transaction form
            this.validateTransactionForm();

        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showError(`Failed to connect wallet: ${error.message}`);
            connectWalletBtn.textContent = 'Connect Extension Wallet';
            connectWalletBtn.disabled = false;
        }
    }

    showSeedInput() {
        document.getElementById('seedInput').classList.remove('hidden');
        document.getElementById('seedPhrase').focus();
    }

    hideSeedInput() {
        document.getElementById('seedInput').classList.add('hidden');
        document.getElementById('seedPhrase').value = '';
    }

    async importFromSeed() {
        const seedPhrase = document.getElementById('seedPhrase').value.trim();
        const importBtn = document.getElementById('importSeedBtn');
        
        if (!seedPhrase) {
            this.showError('Please enter a seed phrase');
            return;
        }

        try {
            importBtn.textContent = 'Importing...';
            importBtn.disabled = true;

            // Wait for crypto to be ready
            await cryptoWaitReady();

            // Initialize keyring if not already done
            if (!this.keyring) {
                this.keyring = new Keyring({ type: 'sr25519' });
            }

            // Hash the seed phrase with SHA-256 before using as seed
            // Create a key pair from the provided string (seed phrase)
            // This uses the Polkadot.js Keyring's addFromUri, which accepts a string (mnemonic, hex, or raw seed)
            this.keyringPair = this.keyring.addFromUri(seedPhrase);
            // const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(seedPhrase));
            // const hashedSeed = new Uint8Array(hashBuffer);
            // this.keyringPair = this.keyring.addFromSeed(hashedSeed);
            
            // Create account object compatible with extension format
            this.currentAccount = {
                address: this.keyringPair.address,
                meta: {
                    name: 'Seed Account',
                    source: 'seed'
                }
            };
            this.accountType = 'seed';

            console.log('Account imported from seed:', this.currentAccount.address);

            // Update UI
            this.updateAccountInfo();
            this.hideSeedInput();
            
            // Update account type display
            document.getElementById('accountType').textContent = '🔑 Seed Phrase Account';
            
            // Start periodic account updates
            this.startAccountUpdates();
            
            // Validate transaction form
            this.validateTransactionForm();

            importBtn.textContent = 'Import Account';
            importBtn.disabled = false;

        } catch (error) {
            console.error('Seed import error:', error);
            this.showError(`Failed to import seed: ${error.message}`);
            importBtn.textContent = 'Import Account';
            importBtn.disabled = false;
        }
    }

    async updateAccountInfo() {
        if (!this.api || !this.currentAccount) return;

        // Show loading indicator overlay
        const accountInfoDiv = document.getElementById('accountInfo');
        let loadingOverlay = document.getElementById('loadingOverlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.className = 'loading-indicator';
            loadingOverlay.textContent = '🔄 Updating...';
            accountInfoDiv.appendChild(loadingOverlay);
        } else {
            loadingOverlay.style.display = 'block';
        }

        try {
            // Get account balance and nonce
            const [accountInfo, nextNonce] = await Promise.all([
                this.api.query.system.account(this.currentAccount.address),
                this.api.rpc.system.accountNextIndex(this.currentAccount.address)
            ]);

            const { data: balance, nonce } = accountInfo;
            
            // Format balances
            const decimals = this.api.registry.chainDecimals[0];
            const unit = this.api.registry.chainTokens[0];
            
            const formattedFree = formatBalance(balance.free, { decimals, withUnit: unit });
            const formattedReserved = formatBalance(balance.reserved, { decimals, withUnit: unit });
            const formattedLocked = formatBalance(balance.frozen, { decimals, withUnit: unit });

            // Update UI with enhanced information
            document.getElementById('accountAddress').textContent = 
                `${this.currentAccount.address.slice(0, 12)}...${this.currentAccount.address.slice(-12)}`;
            
            // Update the balance display to show more details
            const balanceElement = document.getElementById('accountBalance');
            balanceElement.innerHTML = `
                <div><strong>Free:</strong> ${formattedFree}</div>
                <div><strong>Reserved:</strong> ${formattedReserved}</div>
                <div><strong>Locked:</strong> ${formattedLocked}</div>
                <div><strong>Nonce:</strong> ${nonce.toString()}</div>
                <div><strong>Next Nonce:</strong> ${nextNonce.toString()}</div>
            `;
            
            document.getElementById('accountInfo').classList.remove('hidden');

            // Hide loading overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }

            // Add timestamp of last update
            const now = new Date().toLocaleTimeString();
            const updateSource = this.followBestBlock ? 'best block' : 'finalized block';
            const existingTimestamp = document.getElementById('accountUpdateTime');
            if (existingTimestamp) {
                existingTimestamp.textContent = `Last updated: ${now} (${updateSource})`;
            } else {
                const timestampDiv = document.createElement('div');
                timestampDiv.id = 'accountUpdateTime';
                timestampDiv.style.fontSize = '0.8rem';
                timestampDiv.style.color = '#718096';
                timestampDiv.style.marginTop = '8px';
                timestampDiv.textContent = `Last updated: ${now} (${updateSource})`;
                document.getElementById('accountInfo').appendChild(timestampDiv);
            }

        } catch (error) {
            console.error('Error updating account info:', error);
            
            // Hide loading overlay on error
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Show error message
            const balanceElement = document.getElementById('accountBalance');
            balanceElement.innerHTML = '<div style="color: #ef4444;">Error loading account info</div>';
        }
    }

    toggleUpdateMode(followBestBlock) {
        this.followBestBlock = followBestBlock;
        
        // Update the periodic interval based on mode
        if (followBestBlock) {
            // Best block mode: longer interval since we get frequent updates
            this.startAccountUpdates(60000);
        } else {
            // Finalized block mode: shorter interval since finalized blocks are less frequent
            this.startAccountUpdates(30000);
        }
        
        // Immediately update account info
        if (this.currentAccount) {
            this.updateAccountInfo();
        }
        
        // Provide visual feedback
        const toggleContainer = document.querySelector('.toggle-container');
        toggleContainer.style.transform = 'scale(1.05)';
        setTimeout(() => {
            toggleContainer.style.transform = 'scale(1)';
        }, 200);
        
        console.log(`Update mode changed to: ${followBestBlock ? 'Best Block' : 'Finalized Block'}`);
    }

    updateAccountInfoThrottled() {
        const now = Date.now();
        if (now - this.lastAccountUpdate >= this.accountUpdateThrottle) {
            this.lastAccountUpdate = now;
            this.updateAccountInfo();
        }
    }

    startAccountUpdates(intervalMs = null) {
        // Clear any existing interval
        this.stopAccountUpdates();
        
        // Use provided interval or default based on current mode
        const interval = intervalMs || (this.followBestBlock ? 60000 : 30000);
        
        // Update account info at the specified interval
        this.accountUpdateInterval = setInterval(() => {
            if (this.api && this.currentAccount) {
                this.updateAccountInfo();
            }
        }, interval);
    }

    stopAccountUpdates() {
        if (this.accountUpdateInterval) {
            clearInterval(this.accountUpdateInterval);
            this.accountUpdateInterval = null;
        }
    }

    subscribeToBlocks() {
        if (!this.api) return;

        // Subscribe to new blocks (best blocks)
        this.unsubscribeBlocks = this.api.rpc.chain.subscribeNewHeads((header) => {
            this.updateBlockInfo(header);
            // Update account info when new best blocks arrive if following best blocks
            if (this.currentAccount && this.followBestBlock) {
                this.updateAccountInfoThrottled();
            }
        });

        // Get finalized blocks
        this.api.rpc.chain.subscribeFinalizedHeads((header) => {
            this.updateFinalizedBlockInfo(header);
            // Update account info when blocks are finalized if following finalized blocks
            if (this.currentAccount && !this.followBestBlock) {
                this.updateAccountInfo();
            }
        });
    }

    updateBlockInfo(header) {
        document.getElementById('bestBlockNumber').textContent = `#${header.number.toNumber().toLocaleString()}`;
        document.getElementById('bestBlockHash').textContent = header.hash.toString();
    }

    updateFinalizedBlockInfo(header) {
        document.getElementById('finalizedBlockNumber').textContent = `#${header.number.toNumber().toLocaleString()}`;
        document.getElementById('finalizedBlockHash').textContent = header.hash.toString();
    }

    updateConnectionStatus(connected, message) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (connected) {
            statusIndicator.classList.add('connected');
            statusText.textContent = message || 'Connected';
        } else {
            statusIndicator.classList.remove('connected');
            statusText.textContent = message || 'Disconnected';
        }
    }

    updateChainInfo(chainName, version) {
        document.getElementById('chainName').textContent = chainName;
        document.getElementById('chainVersion').textContent = version;
        document.getElementById('chainInfo').classList.remove('hidden');
    }

    validateTransactionForm() {
        const recipientAddress = document.getElementById('recipientAddress').value.trim();
        const transferAmount = document.getElementById('transferAmount').value;
        const sendBtn = document.getElementById('sendTransactionBtn');
        
        const isValid = recipientAddress.length > 0 && 
                       transferAmount > 0 && 
                       this.api && 
                       this.currentAccount;
        
        sendBtn.disabled = !isValid;
    }

    async sendTransaction() {
        const recipientAddress = document.getElementById('recipientAddress').value.trim();
        const transferAmount = document.getElementById('transferAmount').value;
        const sendBtn = document.getElementById('sendTransactionBtn');
        
        if (!this.api || !this.currentAccount) {
            this.showError('Please connect to chain and wallet first');
            return;
        }

        try {
            sendBtn.textContent = 'Preparing...';
            sendBtn.disabled = true;

            // Get account info and validate
            const accountInfo = await this.api.query.system.account(this.currentAccount.address);
            const { data: balance } = accountInfo;
            
            // Get existential deposit
            const existentialDeposit = this.api.consts.balances.existentialDeposit;
            
            // Convert amount to chain units
            const decimals = this.api.registry.chainDecimals[0];
            const unit = this.api.registry.chainTokens[0];
            const amount = BigInt(Math.floor(transferAmount * Math.pow(10, decimals)));

            // Determine injector only for extension accounts
            let injector = null;
            if (this.accountType === 'extension') {
                // Enable extension and get injector for extension accounts
                injector = await web3FromAddress(this.currentAccount.address);
            }

            // Use TypedApi - create the transaction using the typed API
            const tx = this.api.tx.balances.transferKeepAlive(recipientAddress, amount);
            
            console.log('Transaction created:', tx.method.toHuman());
            
            // Get payment info to estimate fees
            const paymentInfo = await tx.paymentInfo(this.currentAccount.address);
            
            console.log('Payment Info:', {
                weight: paymentInfo.weight.toHuman(),
                class: paymentInfo.class.toString(),
                partialFee: formatBalance(paymentInfo.partialFee, { decimals, withUnit: unit })
            });
            
            // Calculate if sender will have enough balance
            const totalCost = amount + paymentInfo.partialFee.toBigInt();
            const remainingBalance = balance.free.toBigInt() - totalCost;
            
            console.log('Balance Check:', {
                free: formatBalance(balance.free, { decimals, withUnit: unit }),
                amount: formatBalance(amount, { decimals, withUnit: unit }),
                fee: formatBalance(paymentInfo.partialFee, { decimals, withUnit: unit }),
                remaining: formatBalance(remainingBalance, { decimals, withUnit: unit }),
                existentialDeposit: formatBalance(existentialDeposit, { decimals, withUnit: unit })
            });
            
            // Validate sender will keep minimum balance
            if (remainingBalance < existentialDeposit.toBigInt()) {
                const minRequired = existentialDeposit.toBigInt() + totalCost;
                const minRequiredFormatted = formatBalance(minRequired, { decimals, withUnit: unit });
                const currentFormatted = formatBalance(balance.free, { decimals, withUnit: unit });
                
                throw new Error(
                    `Insufficient balance. You need at least ${minRequiredFormatted} but only have ${currentFormatted}. ` +
                    `This transaction would leave your account below the existential deposit.`
                );
            }

            // Validate recipient address
            try {
                this.api.createType('AccountId', recipientAddress);
            } catch (e) {
                throw new Error('Invalid recipient address format');
            }

            sendBtn.textContent = 'Signing...';

            // Create unique transaction ID
            const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create initial transaction history entry with timing
            const txHistoryData = {
                id: txId,
                from: this.currentAccount.address,
                to: recipientAddress,
                amount: formatBalance(amount, { decimals, withUnit: unit }),
                status: 'pending',
                statusText: 'Signing...',
                hash: null,
                blockHash: null,
                timing: {
                    submitted: Date.now(),
                    ready: null,
                    broadcast: null,
                    inBlock: null,
                    finalized: null
                }
            };

            // Sign and send the transaction - handle both extension and seed accounts
            let unsub;
            const statusCallback = (result) => {
                const { status, events, dispatchError } = result;
                console.log(`[${txId}] Transaction status:`, status.type);
                    
                    // Update hash if not set yet and register in pending transactions
                    if (!txHistoryData.hash && status.hash) {
                        txHistoryData.hash = result.txHash.toHex();
                        this.pendingTransactions.set(txHistoryData.hash, {
                            txId,
                            data: txHistoryData,
                            unsub
                        });
                        console.log(`[${txId}] Transaction hash: ${txHistoryData.hash}`);
                    }
                    
                    // Handle different status types
                    if (status.isInBlock) {
                        console.log(`[${txId}] ✓ Transaction included in block: ${status.asInBlock.toHex()}`);
                        
                        // Update transaction data
                        txHistoryData.status = 'success';
                        txHistoryData.statusText = 'Included in Block';
                        txHistoryData.blockHash = status.asInBlock.toHex();
                        txHistoryData.timing.inBlock = Date.now();
                        
                        // Update in pending transactions map
                        if (this.pendingTransactions.has(txHistoryData.hash)) {
                            this.pendingTransactions.get(txHistoryData.hash).data = txHistoryData;
                        }
                        
                        // Calculate timing metrics
                        const inBlockTime = txHistoryData.timing.inBlock - txHistoryData.timing.submitted;
                        const readyToInBlock = txHistoryData.timing.ready ? 
                            txHistoryData.timing.inBlock - txHistoryData.timing.ready : null;
                        console.log(`[${txId}] Time to inclusion: ${inBlockTime}ms (${(inBlockTime/1000).toFixed(2)}s)`);
                        if (readyToInBlock) {
                            console.log(`[${txId}] Ready -> InBlock: ${readyToInBlock}ms (${(readyToInBlock/1000).toFixed(2)}s)`);
                        }
                        
                        this.showTransactionStatus('success', 
                            `✅ [${txId}] Transaction ${txHistoryData.hash.slice(0, 10)}... included in block ${status.asInBlock.toHex().slice(0, 10)}...`
                        );
                        this.updateAccountInfo();
                    
                        sendBtn.textContent = 'Send';
                        sendBtn.disabled = false;
                        
                        // Add to history
                        this.addTransactionToHistory(txHistoryData);
                        
                        console.log(`[${txId}] Pending transactions: ${this.pendingTransactions.size}`);
                        this.updatePendingCount();
                        
                        // Don't unsubscribe yet, wait for finalized
                        
                    } else if (status.isFinalized) {
                        console.log(`[${txId}] 🎉 Transaction finalized in block: ${status.asFinalized.toHex()}`);
                        
                        // Update transaction data
                        txHistoryData.status = 'success';
                        txHistoryData.statusText = 'Finalized ✓';
                        txHistoryData.blockHash = status.asFinalized.toHex();
                        txHistoryData.finalizedBlockHash = status.asFinalized.toHex();
                        txHistoryData.timing.finalized = Date.now();
                        
                        // Calculate full timing metrics
                        const totalTime = txHistoryData.timing.finalized - txHistoryData.timing.submitted;
                        const inBlockToFinalized = txHistoryData.timing.inBlock ? 
                            txHistoryData.timing.finalized - txHistoryData.timing.inBlock : null;
                        
                        console.log(`[${txId}] 🎯 TIMING SUMMARY:`);
                        console.log(`  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
                        if (txHistoryData.timing.ready) {
                            console.log(`  Submit -> Ready: ${txHistoryData.timing.ready - txHistoryData.timing.submitted}ms`);
                        }
                        if (txHistoryData.timing.inBlock) {
                            console.log(`  Submit -> InBlock: ${txHistoryData.timing.inBlock - txHistoryData.timing.submitted}ms`);
                        }
                        if (inBlockToFinalized) {
                            console.log(`  InBlock -> Finalized: ${inBlockToFinalized}ms (${(inBlockToFinalized/1000).toFixed(2)}s)`);
                        }
                        
                        // Update transaction in history (will update existing entry)
                        const updated = this.updateTransactionInHistory(txHistoryData.hash, {
                            status: 'success',
                            statusText: 'Finalized ✓',
                            blockHash: status.asFinalized.toHex(),
                            finalizedBlockHash: status.asFinalized.toHex(),
                            timing: txHistoryData.timing
                        });
                        
                        if (!updated) {
                            // If not in history yet, add it
                            this.addTransactionToHistory(txHistoryData);
                        }
                        
                        this.showTransactionStatus('success', 
                            `🎉 [${txId}] Transaction finalized in ${(totalTime/1000).toFixed(2)}s`
                        );
                        this.updateAccountInfo();

                        // Remove from pending transactions and unsubscribe
                        if (this.pendingTransactions.has(txHistoryData.hash)) {
                            this.pendingTransactions.delete(txHistoryData.hash);
                            console.log(`[${txId}] Removed from pending. Remaining: ${this.pendingTransactions.size}`);
                            this.updatePendingCount();
                        }
                        unsub();
                        
                    } else if (status.isBroadcast) {
                        console.log(`[${txId}] 📡 Transaction broadcast to network`);
                        txHistoryData.statusText = 'Broadcasting';
                        txHistoryData.timing.broadcast = Date.now();
                        
                        if (this.pendingTransactions.has(txHistoryData.hash)) {
                            this.pendingTransactions.get(txHistoryData.hash).data = txHistoryData;
                        }
                        
                        const broadcastTime = txHistoryData.timing.broadcast - txHistoryData.timing.submitted;
                        console.log(`[${txId}] Time to broadcast: ${broadcastTime}ms`);
                        
                        this.showTransactionStatus('pending', `📡 [${txId}] Transaction broadcast to network`);
                        sendBtn.textContent = 'Broadcasting...';
                        
                    } else if (status.isReady) {
                        console.log(`[${txId}] ⏳ Transaction is ready and in queue`);
                        txHistoryData.statusText = 'In Queue';
                        txHistoryData.status = 'pending';
                        txHistoryData.timing.ready = Date.now();
                        
                        // Update in pending transactions map
                        if (this.pendingTransactions.has(txHistoryData.hash)) {
                            this.pendingTransactions.get(txHistoryData.hash).data = txHistoryData;
                        }
                        
                        // Add to history when ready
                        this.addTransactionToHistory(txHistoryData);
                        
                        const readyTime = txHistoryData.timing.ready - txHistoryData.timing.submitted;
                        console.log(`[${txId}] Time to ready: ${readyTime}ms`);
                        
                        this.showTransactionStatus('pending', `⏳ [${txId}] Transaction ready and in queue`);
                        sendBtn.textContent = 'Send';
                        sendBtn.disabled = false;
                        
                    } else if (status.isDropped || status.isInvalid || status.isUsurped) {
                        console.error(`[${txId}] ❌ Transaction dropped or invalid:`, status.type);
                        
                        // Add failed transaction to history
                        txHistoryData.status = 'error';
                        txHistoryData.statusText = `Failed: ${status.type}`;
                        txHistoryData.error = `Transaction ${status.type}`;
                        this.addTransactionToHistory(txHistoryData);
                        
                        // Remove from pending transactions
                        if (this.pendingTransactions.has(txHistoryData.hash)) {
                            this.pendingTransactions.delete(txHistoryData.hash);
                            console.log(`[${txId}] Removed from pending (failed). Remaining: ${this.pendingTransactions.size}`);
                            this.updatePendingCount();
                        }
                        
                        this.showTransactionStatus('error', `❌ [${txId}] Transaction ${status.type}`);
                        sendBtn.textContent = 'Send';
                        sendBtn.disabled = false;
                        unsub();
                        
                    } else {
                        console.log(`[${txId}] ℹ️ Transaction status: ${status.type}`);
                    }
                };

            // Sign and send based on account type
            if (this.accountType === 'seed') {
                // Use keyring pair for seed-based accounts
                unsub = await tx.signAndSend(this.keyringPair, statusCallback);
            } else {
                // Use extension signer for extension wallets
                unsub = await tx.signAndSend(
                    this.currentAccount.address,
                    { 
                        signer: injector.signer,
                        nonce: -1
                    },
                    statusCallback
                );
            }

            this.showTransactionStatus('pending', `📡 [${txId}] Transaction submitted and broadcasting...`);
            console.log(`Total pending transactions: ${this.pendingTransactions.size}`);
            this.updatePendingCount();

        } catch (error) {
            console.error('Transaction error:', error);
            
            // Parse different error types
            let errorMessage = error.message;
            
            if (error.message.includes('1010: Invalid Transaction')) {
                errorMessage = 'Transaction would be invalid. Please check your balance and try again.';
            } else if (error.message.includes('Inability to pay')) {
                errorMessage = 'Insufficient balance to pay transaction fees.';
            } else if (error.message.includes('Cancelled')) {
                errorMessage = 'Transaction was cancelled by user.';
            } else if (error.message.includes('Unsupported')) {
                errorMessage = 'API version mismatch. Try reconnecting to the chain.';
            }
            
            // Add error to history if we have transaction data
            if (txHistoryData) {
                txHistoryData.status = 'error';
                txHistoryData.statusText = 'Failed';
                txHistoryData.error = errorMessage;
                this.addTransactionToHistory(txHistoryData);
                
                // Remove from pending if it was added
                if (txHistoryData.hash && this.pendingTransactions.has(txHistoryData.hash)) {
                    this.pendingTransactions.delete(txHistoryData.hash);
                    console.log(`[${txId}] Removed from pending (error). Remaining: ${this.pendingTransactions.size}`);
                    this.updatePendingCount();
                }
            }
            
            this.showTransactionStatus('error', `❌ [${txId || 'ERROR'}] ${errorMessage}`);
            sendBtn.textContent = 'Send';
            sendBtn.disabled = false;
        }
    }



    showTransactionStatus(type, message) {
        const statusDiv = document.getElementById('transactionStatus');
        const messageP = document.getElementById('transactionMessage');
        
        if (!statusDiv || !messageP) {
            console.error('Transaction status elements not found');
            return;
        }
        
        // Clear any existing timeout
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
        }
        
        statusDiv.className = `transaction-status ${type}`;
        messageP.textContent = message;
        statusDiv.classList.remove('hidden');
        
        console.log(`📋 Status Update: [${type}] ${message}`);
        
        // Auto-hide success messages after 10 seconds
        if (type === 'success') {
            this.statusTimeout = setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 10000);
        }
        
        // Auto-hide error messages after 15 seconds
        if (type === 'error') {
            this.statusTimeout = setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 15000);
        }
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    addTransactionToHistory(txData) {
        // Check if transaction already exists by hash (only if hash is available)
        let existingIndex = -1;
        if (txData.hash) {
            existingIndex = this.transactionHistory.findIndex(
                tx => tx.hash && tx.hash === txData.hash
            );
        }
        
        if (existingIndex !== -1) {
            // Update existing transaction
            console.log(`Updating existing transaction in history: ${txData.hash?.slice(0, 10)}...`, txData.statusText);
            this.transactionHistory[existingIndex] = {
                ...this.transactionHistory[existingIndex],
                ...txData,
                timestamp: this.transactionHistory[existingIndex].timestamp // Keep original timestamp
            };
        } else {
            // Add to beginning of array (newest first)
            console.log(`Adding new transaction to history: ${txData.hash?.slice(0, 10) || txData.id}`, txData.statusText);
            this.transactionHistory.unshift({
                ...txData,
                timestamp: new Date()
            });
        }

        console.log(`Total transactions in history: ${this.transactionHistory.length}`);

        // Keep only last 50 transactions
        if (this.transactionHistory.length > 50) {
            this.transactionHistory = this.transactionHistory.slice(0, 50);
        }

        // Save to localStorage
        this.saveTransactionHistory();
        
        // Update UI
        this.renderTransactionHistory();
    }

    updateTransactionInHistory(txHash, updates) {
        const index = this.transactionHistory.findIndex(tx => tx.hash === txHash);
        if (index !== -1) {
            this.transactionHistory[index] = {
                ...this.transactionHistory[index],
                ...updates
            };
            this.saveTransactionHistory();
            this.renderTransactionHistory();
            return true;
        }
        return false;
    }

    renderTransactionHistory() {
        const historyDiv = document.getElementById('transactionHistory');
        
        console.log(`Rendering ${this.transactionHistory.length} transactions in history`);
        
        if (this.transactionHistory.length === 0) {
            historyDiv.innerHTML = '<p class="no-transactions">No transactions yet. Send your first transaction to see it here!</p>';
            this.updateChart(); // Update chart even if empty
            return;
        }

        // Update the timing chart with latest data
        this.updateChart();

        historyDiv.innerHTML = this.transactionHistory.map((tx, index) => {
            console.log(`[${index}] Rendering tx:`, tx.id, tx.hash?.slice(0, 10), tx.statusText);
            
            const time = tx.timestamp.toLocaleTimeString();
            const date = tx.timestamp.toLocaleDateString();
            const statusClass = tx.status || 'pending';
            const statusIcon = {
                'success': '✅',
                'pending': '⏳',
                'error': '❌'
            }[statusClass] || '📝';

            // Calculate timing display
            let timingInfo = '';
            if (tx.timing) {
                const parts = [];
                if (tx.timing.ready) {
                    const readyTime = ((tx.timing.ready - tx.timing.submitted) / 1000).toFixed(2);
                    parts.push(`Ready: ${readyTime}s`);
                }
                if (tx.timing.inBlock) {
                    const inBlockTime = ((tx.timing.inBlock - tx.timing.submitted) / 1000).toFixed(2);
                    parts.push(`InBlock: ${inBlockTime}s`);
                }
                if (tx.timing.finalized) {
                    const finalizedTime = ((tx.timing.finalized - tx.timing.submitted) / 1000).toFixed(2);
                    parts.push(`Finalized: ${finalizedTime}s`);
                }
                if (parts.length > 0) {
                    timingInfo = `<div class="tx-timing">⏱️ ${parts.join(' • ')}</div>`;
                }
            }

            return `
                <div class="tx-item ${statusClass}">
                    <div class="tx-header">
                        <span class="tx-status">${statusIcon} ${tx.statusText || 'Pending'}</span>
                        <span class="tx-time">${date} ${time}</span>
                    </div>
                    <div class="tx-details">
                        ${tx.from ? `<div><strong>From:</strong> ${tx.from.slice(0, 12)}...${tx.from.slice(-8)}</div>` : ''}
                        ${tx.to ? `<div><strong>To:</strong> ${tx.to.slice(0, 12)}...${tx.to.slice(-8)}</div>` : ''}
                        ${tx.amount ? `<div><strong>Amount:</strong> ${tx.amount}</div>` : ''}
                        ${tx.hash ? `<div><strong>Tx Hash:</strong> <a href="#" class="tx-hash" title="${tx.hash}">${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}</a></div>` : ''}
                        ${tx.finalizedBlockHash ? `<div><strong>Finalized:</strong> <span class="tx-hash" title="${tx.finalizedBlockHash}">${tx.finalizedBlockHash.slice(0, 10)}...${tx.finalizedBlockHash.slice(-8)}</span></div>` : 
                          tx.blockHash ? `<div><strong>Block:</strong> <span class="tx-hash" title="${tx.blockHash}">${tx.blockHash.slice(0, 10)}...${tx.blockHash.slice(-8)}</span></div>` : ''}
                        ${tx.error ? `<div><strong>Error:</strong> ${tx.error}</div>` : ''}
                    </div>
                    ${timingInfo}
                </div>
            `;
        }).join('');
    }

    saveTransactionHistory() {
        try {
            localStorage.setItem('polkadot_tx_history', JSON.stringify(
                this.transactionHistory.map(tx => ({
                    ...tx,
                    timestamp: tx.timestamp.toISOString()
                }))
            ));
        } catch (e) {
            console.error('Failed to save transaction history:', e);
        }
    }

    loadTransactionHistory() {
        try {
            const saved = localStorage.getItem('polkadot_tx_history');
            if (saved) {
                this.transactionHistory = JSON.parse(saved).map(tx => ({
                    ...tx,
                    timestamp: new Date(tx.timestamp)
                }));
                this.renderTransactionHistory();
            }
        } catch (e) {
            console.error('Failed to load transaction history:', e);
            this.transactionHistory = [];
        }
    }

    clearTransactionHistory() {
        if (confirm('Are you sure you want to clear all transaction history?')) {
            this.transactionHistory = [];
            localStorage.removeItem('polkadot_tx_history');
            
            // Hide chart stats
            document.getElementById('chartStats').classList.add('hidden');
            
            // Clear chart
            if (this.timingChart) {
                this.timingChart.data.labels = [];
                this.timingChart.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });
                this.timingChart.update();
            }
            
            this.renderTransactionHistory();
            console.log('Transaction history cleared');
        }
    }

    updatePendingCount() {
        const pendingCountEl = document.getElementById('pendingCount');
        const count = this.pendingTransactions.size;
        
        if (count > 0) {
            pendingCountEl.textContent = `⏳ ${count} pending`;
            pendingCountEl.classList.remove('hidden');
        } else {
            pendingCountEl.classList.add('hidden');
        }
    }

    initChart() {
        const ctx = document.getElementById('timingChart');
        if (!ctx) return;

        this.timingChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Ready',
                        data: [],
                        borderColor: 'rgba(245, 158, 11, 1)',
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgba(245, 158, 11, 0.8)',
                        pointBorderColor: 'rgba(245, 158, 11, 1)',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'InBlock',
                        data: [],
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgba(59, 130, 246, 0.8)',
                        pointBorderColor: 'rgba(59, 130, 246, 1)',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Finalized',
                        data: [],
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgba(16, 185, 129, 0.8)',
                        pointBorderColor: 'rgba(16, 185, 129, 1)',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm'
                            },
                            tooltipFormat: 'MMM dd, HH:mm:ss'
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkipPadding: 20
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (seconds)'
                        },
                        ticks: {
                            callback: function(value) {
                                return (value / 1000).toFixed(1) + 's';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const seconds = (context.parsed.y / 1000).toFixed(2);
                                label += seconds + 's';
                                label += ' (' + context.parsed.y + 'ms)';
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    updateChart() {
        if (!this.timingChart) {
            this.initChart();
        }

        // Get all transactions with timing data (not just finalized)
        const allTxs = this.transactionHistory
            .filter(tx => tx.timing && tx.timestamp)
            .slice(0, 50) // Last 50 transactions
            .reverse(); // Oldest first for chronological time series

        if (allTxs.length === 0) {
            return;
        }

        // Prepare time series data - show points as soon as they're available
        // Ready: Show as soon as ready timestamp is available
        const readyData = allTxs
            .filter(tx => tx.timing.ready)
            .map(tx => ({
                x: tx.timestamp,
                y: tx.timing.ready - tx.timing.submitted,
                txId: tx.id
            }));

        // InBlock: Show as soon as inBlock timestamp is available
        const inBlockData = allTxs
            .filter(tx => tx.timing.inBlock)
            .map(tx => ({
                x: tx.timestamp,
                y: tx.timing.inBlock - tx.timing.submitted,
                txId: tx.id
            }));

        // Finalized: Show as soon as finalized timestamp is available
        const finalizedData = allTxs
            .filter(tx => tx.timing.finalized)
            .map(tx => ({
                x: tx.timestamp,
                y: tx.timing.finalized - tx.timing.submitted,
                txId: tx.id
            }));

        // Update chart datasets
        this.timingChart.data.datasets[0].data = readyData;
        this.timingChart.data.datasets[1].data = inBlockData;
        this.timingChart.data.datasets[2].data = finalizedData;
        this.timingChart.update();

        // Calculate and display statistics (only for completed data)
        const readyTimes = readyData.map(d => d.y);
        const inBlockTimes = inBlockData.map(d => d.y);
        const finalizedTimes = finalizedData.map(d => d.y);

        const avgReady = readyTimes.length > 0 ? readyTimes.reduce((a, b) => a + b, 0) / readyTimes.length : 0;
        const avgInBlock = inBlockTimes.length > 0 ? inBlockTimes.reduce((a, b) => a + b, 0) / inBlockTimes.length : 0;
        const avgFinalized = finalizedTimes.length > 0 ? finalizedTimes.reduce((a, b) => a + b, 0) / finalizedTimes.length : 0;

        // Show stats if we have any data
        if (readyTimes.length > 0 || inBlockTimes.length > 0 || finalizedTimes.length > 0) {
            document.getElementById('avgReady').textContent = avgReady > 0 ? `${(avgReady / 1000).toFixed(2)}s` : '-';
            document.getElementById('avgInBlock').textContent = avgInBlock > 0 ? `${(avgInBlock / 1000).toFixed(2)}s` : '-';
            document.getElementById('avgFinalized').textContent = avgFinalized > 0 ? `${(avgFinalized / 1000).toFixed(2)}s` : '-';
            document.getElementById('chartStats').classList.remove('hidden');
        }
    }

    updateUI() {
        // Initial UI state
        this.updateConnectionStatus(false);
        this.validateTransactionForm();
        
        // Load transaction history
        this.loadTransactionHistory();
        
        // Initialize chart
        setTimeout(() => this.initChart(), 100);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PolkadotApp();
}); 