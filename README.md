# Tic-Tac-Toe Horror Game - Polkadot Parachain

A blockchain-based Tic-Tac-Toe game with a "Saw" movie horror aesthetic, built on Polkadot using a custom pallet for on-chain game logic and matchmaking.

## 🎮 Features

### Game Features
- 🎲 **On-chain Tic-Tac-Toe**: All game logic runs on the blockchain
- 🤝 **Automatic Matchmaking**: Join a queue and get matched with another player
- ⏱️ **Timeout System**: 30-second turn timer with victory claim option
- 🏆 **Winning Animations**: Permanent glowing effect for winning combinations
- 💰 **Prize System**: Winners receive tokens automatically
- 🎵 **Horror Sound Effects**: Atmospheric audio for game events

### Blockchain Features
- 🔗 **Chain Connection**: Connect to Polkadot parachain via RPC endpoint
- 📦 **Block Monitoring**: Real-time display of best and finalized blocks
- 👤 **Account Management**: Seed phrase import or Polkadot{.js} extension
- 💸 **Auto-mint**: Automatic token minting for new players (1000 UNIT)
- 📊 **Transaction Tracking**: Real-time transaction status and statistics

### UI/UX Features
- 🎨 **"Saw" Movie Theme**: Dark, industrial horror aesthetic
- 🩸 **Blood Effects**: Animated blood splash on symbol placement
- 💀 **Horror Visuals**: Film grain, blood splatters, warning stripes
- 📈 **Performance Charts**: Transaction latency visualization
- 🎯 **Responsive Design**: Works on desktop and mobile

## 🎭 Visual Theme

The app features a complete "Saw" movie aesthetic:
- Dark industrial background with horror overlays
- Blood-red accents and glowing effects
- Metallic rivets and warning stripes
- Film grain and vignette effects
- Heartbeat animation for new symbols
- Permanent glow for winning lines

## 🎵 Audio

- **Sound Effects**: Metallic clangs, horror chords, eerie whispers, ticking clocks
- **Toggle Control**: Mute/unmute button in the header
- **Event-driven**: Sounds play on cell clicks, matchmaking, wins/losses

## 📋 Prerequisites

1. **Node.js** (version 16 or higher)
2. **npm** or **yarn** package manager
3. **Polkadot{.js} browser extension** (optional, can use seed phrase)
4. **Access to the Polkadot parachain** with the `tic-tac-toe` pallet

### Installing Polkadot{.js} Extension

1. Visit [Polkadot{.js} extension page](https://polkadot.js.org/extension/)
2. Install for Chrome, Firefox, or Edge
3. Create or import an account

## 🚀 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
```bash
npm run build
```

4. **Preview production build**:
```bash
npm run preview
```

## 🎮 How to Play

### 1. Connect to Chain

1. The app auto-connects to: `wss://versi-yap-2021-rpc.parity-versi.parity.io`
2. Wait for connection confirmation
3. Block numbers will update in the header

### 2. Connect Account

**Option A: Polkadot{.js} Extension**
- Click "Connect Wallet"
- Authorize in the extension popup
- Your balance will display

**Option B: Seed Phrase**
- Click "Use Seed Phrase"
- Enter your 12-word seed phrase
- Click "Import"

### 3. Auto-mint Tokens

- If your balance is 0, the app automatically mints 1000 UNIT
- This happens once when you first connect

### 4. Start Playing

1. Click "Play Game" to join matchmaking queue
2. Wait for another player (or cancel)
3. When matched, the game starts automatically
4. Click cells to make your move (X or O)
5. Each player has 30 seconds per turn
6. Win by getting 3 in a row (horizontal, vertical, or diagonal)

### 5. Timeout Victory

- If opponent doesn't move within 30 seconds
- "Claim Victory" button appears
- Click to claim win and receive prize

### 6. New Game

- After a game ends, click "Reset Game"
- Joins matchmaking queue again

## 🏗️ Project Structure

```
├── index.html                 # Main HTML with horror theme
├── style.css                  # Complete "Saw" aesthetic styling
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite build configuration
├── src/
│   ├── App.js                # Main application orchestrator
│   └── managers/
│       ├── ChainManager.js       # Blockchain connection
│       ├── AccountManager.js     # Account/wallet management
│       ├── GameManager.js        # Game logic coordination
│       ├── GameState.js          # Game state management
│       ├── MatchmakingManager.js # Queue management
│       ├── TransactionManager.js # Transaction tracking
│       ├── UIManager.js          # UI updates and rendering
│       └── SoundManager.js       # Horror sound effects
└── dist/                     # Production build output
```

## 🎨 Technical Architecture

### Modular Design

The app uses a manager-based architecture:
- **ChainManager**: WebSocket connection, block subscriptions, runtime APIs
- **AccountManager**: Wallet integration, balance tracking
- **GameManager**: Game setup, move submission, event handling
- **GameState**: Centralized state with change notifications
- **MatchmakingManager**: Queue join/leave, status checks
- **TransactionManager**: Transaction history, statistics
- **UIManager**: DOM manipulation, visual updates
- **SoundManager**: Web Audio API sound generation

### State Management

- **GameState** is the single source of truth
- State changes trigger UI updates via callbacks
- No direct UI manipulation from game logic
- Clean separation of concerns

### Blockchain Integration

**Custom Runtime APIs:**
- `TicTacToeApi_get_player_game`: Get active game for player

**Extrinsics:**
- `play_game()`: Join matchmaking queue
- `make_move(position)`: Make a move in active game
- `claim_timeout()`: Claim victory on timeout
- `cancel_matchmaking()`: Leave queue
- `mint_funds(amount)`: Mint tokens (auto-called)

**Events:**
- `PlayerJoinedQueue`: Player entered matchmaking
- `GameCreated`: New game started
- `MoveMade`: Player made a move
- `GameEnded`: Game finished with winner
- `PrizeTransferred`: Winner received tokens

## 🎯 Game Rules

1. **Board**: 3x3 grid
2. **Symbols**: X and O
3. **Turn Timer**: 30 seconds per move
4. **Win Condition**: 3 in a row (any direction)
5. **Draw**: All cells filled, no winner
6. **Timeout**: Opponent can claim victory after 30s

## 🎨 Visual Effects

### Animations
- **Heartbeat**: 1.5s double-beat pulse on new symbols
- **Board Shake**: 5px horizontal shake (250ms)
- **Blood Pulse**: 1s red glow after placement
- **Winner Glow**: Infinite pulsing for winning line
- **Blood Splash**: Animated blood effect on cells

### Styling
- **Background**: Industrial room with blur and dimming
- **Panels**: Blood shadows, metal rivets, warning stripes
- **Film Grain**: Procedural noise overlay
- **Vignette**: Dark edges for focus
- **Colors**: Dark reds, grays, industrial metals

## 📊 Transaction Statistics

The app tracks and displays:
- **Ready Time**: Time to transaction ready
- **In Block Time**: Time to inclusion in block
- **Finalized Time**: Time to finalization
- **Charts**: Visual latency graphs
- **History**: Last 10 transactions with status

## 🔧 Configuration

### RPC Endpoint

Default: `wss://versi-yap-2021-rpc.parity-versi.parity.io`

To change:
1. Edit `index.html` line 73
2. Or modify in the UI header

### Timeout Duration

Default: 30 seconds

To change:
1. Edit `src/App.js` line 23
2. Modify `TIMEOUT_SECONDS` constant

### Sound Volume

Default: 50%

To change:
1. Edit `src/managers/SoundManager.js` line 5
2. Modify `this.volume` (0.0 to 1.0)

## 🐛 Troubleshooting

### Connection Issues
- **"Failed to connect"**: Check RPC endpoint URL
- **"WebSocket error"**: Ensure network connectivity
- **Auto-reconnect**: App will retry automatically

### Account Issues
- **"No extension found"**: Install Polkadot{.js} extension
- **"Import failed"**: Check seed phrase format (12 words)
- **"Zero balance"**: Auto-mint should trigger automatically

### Game Issues
- **"No game ID"**: Matchmaking may have failed, try again
- **"Please start a game"**: Click "Play Game" to join queue
- **"Transaction failed"**: Check balance and chain status
- **Board not updating**: Refresh page and reconnect

### UI Issues
- **Symbols not visible**: Check browser compatibility
- **Animations stuttering**: Disable hardware acceleration
- **Sounds not playing**: Click anywhere to enable audio context

## 🌐 Browser Compatibility

Tested and working on:
- ✅ Chrome 88+
- ✅ Firefox 78+
- ✅ Safari 14+
- ✅ Edge 88+

Requires:
- ES2020+ JavaScript
- WebSocket support
- Web Audio API
- CSS Grid and Flexbox

## 🔒 Security

- **Private Keys**: Never exposed, handled by extension or derived from seed
- **Seed Storage**: Not persisted, only in memory during session
- **Transaction Signing**: All signing happens client-side
- **RPC Security**: Use trusted endpoints only
- **No Backend**: Fully client-side application

## 📈 Performance

- **Bundle Size**: ~1.1 MB (minified)
- **Gzipped**: ~410 KB
- **Load Time**: < 2s on average connection
- **FPS**: 60fps animations with GPU acceleration
- **Memory**: ~50 MB typical usage

## 🎓 Learning Resources

- [Polkadot.js API Docs](https://polkadot.js.org/docs/)
- [Substrate Documentation](https://docs.substrate.io/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License. 

## 🎬 Credits

- **Theme Inspiration**: "Saw" movie franchise
- **Blockchain**: Polkadot/Substrate
- **Audio**: Web Audio API procedural generation
- **Icons**: SVG custom designs

---

**Built with ❤️ and 💀 for the Polkadot ecosystem**
