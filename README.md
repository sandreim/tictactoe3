# Polkadot Parachain Web App

A modern web application for connecting to Polkadot parachains, monitoring blocks, and sending transactions using the Polkadot.js API.

## Features

- 🔗 **Chain Connection**: Connect to any Polkadot parachain via RPC endpoint
- 📦 **Block Monitoring**: Real-time display of best and finalized blocks
- 👤 **Wallet Integration**: Connect with Polkadot{.js} browser extension
- 💸 **Transactions**: Send `balance_keep_alive` transactions
- 🎨 **Modern UI**: Beautiful and responsive design with glassmorphism effects

## Prerequisites

Before running this application, ensure you have:

1. **Node.js** (version 16 or higher)
2. **npm** or **yarn** package manager
3. **Polkadot{.js} browser extension** installed in your browser

### Installing Polkadot{.js} Extension

1. Visit the [Polkadot{.js} extension page](https://polkadot.js.org/extension/)
2. Install the extension for your browser (Chrome, Firefox, or Edge)
3. Create or import an account with some balance for testing

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### 1. Connect to a Parachain

1. Enter a valid RPC endpoint in the "RPC Endpoint" field
   - Default: `wss://rpc.polkadot.io` (Polkadot mainnet)
   - For parachains, use their specific RPC endpoints
   - Examples:
     - Kusama: `wss://kusama-rpc.polkadot.io`
     - Acala: `wss://acala-rpc-0.aca-api.network`
     - Moonbeam: `wss://wss.api.moonbeam.network`

2. Click the "Connect" button
3. Wait for the connection to establish
4. Chain information will be displayed once connected

### 2. Monitor Blocks

Once connected to a chain:
- **Best Block**: Shows the latest block number and hash
- **Finalized Block**: Shows the most recent finalized block
- Both update automatically in real-time

### 3. Connect Your Wallet

1. Click "Connect Wallet" in the Account section
2. Authorize the connection in your Polkadot{.js} extension
3. Your account address and balance will be displayed

### 4. Send Transactions

1. Ensure you're connected to both a chain and your wallet
2. Enter the recipient's address in the "Recipient Address" field
3. Set the transfer amount (minimum amount to keep the account alive)
4. Click "Send"
5. Confirm the transaction in your Polkadot{.js} extension
6. Monitor the transaction status in the UI

## Technical Details

### Balance Keep Alive Transaction

The `balance_keep_alive` transaction is a special type of transfer that ensures:
- The sender's account remains above the existential deposit
- The account won't be reaped (removed) from the chain
- It's safer than regular transfers as it prevents accidental account closure

### Supported Networks

This app can connect to any Substrate-based blockchain that supports:
- WebSocket RPC connections
- Standard Polkadot.js API compatibility
- Balance transfers

### Key Components

- **API Connection**: Manages WebSocket connection to the chain
- **Block Subscription**: Real-time block monitoring
- **Wallet Integration**: Polkadot{.js} extension integration
- **Transaction Handling**: Secure transaction signing and submission

## Development

### Project Structure

```
├── index.html          # Main HTML file
├── app.js             # Main JavaScript application
├── style.css          # Styling and CSS
├── package.json       # Dependencies and scripts
├── vite.config.js     # Vite configuration
└── README.md          # This file
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Dependencies

- **@polkadot/api**: Core API for interacting with Polkadot networks
- **@polkadot/extension-dapp**: Browser extension integration
- **@polkadot/util**: Utility functions for Polkadot development
- **@polkadot/util-crypto**: Cryptographic utilities
- **vite**: Fast build tool and development server

## Troubleshooting

### Common Issues

1. **"No Polkadot extension found"**
   - Install the Polkadot{.js} browser extension
   - Refresh the page after installation

2. **"Connection failed"**
   - Check if the RPC endpoint is correct and accessible
   - Ensure your internet connection is stable
   - Try a different RPC endpoint

3. **"Transaction failed"**
   - Ensure you have sufficient balance for the transaction
   - Check that the recipient address is valid
   - Make sure the amount doesn't exceed your available balance

4. **Blocks not updating**
   - Check the browser console for WebSocket errors
   - Ensure the RPC connection is still active
   - Try reconnecting to the chain

### Browser Compatibility

This application works best with modern browsers that support:
- ES2020+ JavaScript features
- WebSocket connections
- Browser extensions

Recommended browsers:
- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Security Considerations

- **Private Keys**: This app never handles private keys directly
- **Extension Security**: All signing happens within the Polkadot{.js} extension
- **RPC Endpoints**: Only connect to trusted RPC endpoints
- **Transaction Review**: Always review transactions before signing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License. 