# Modular Architecture

## Structure

```
src/
├── main.js                 # Entry point
├── App.js                  # Main application coordinator
└── managers/
    ├── ChainManager.js     # Blockchain connection & RPC
    ├── AccountManager.js   # Wallet & account management
    ├── GameManager.js      # Tic-tac-toe game logic
    ├── MatchmakingManager.js # Matchmaking system
    ├── TransactionManager.js # Transaction tracking & history
    └── UIManager.js        # DOM manipulation & UI updates
```

## Managers

### ChainManager
**Responsibility**: Blockchain connection and communication
- Connect/disconnect from RPC
- Subscribe to new blocks
- Maintain block window
- Check connection status

### AccountManager
**Responsibility**: User account management
- Connect wallet (extension)
- Create account from seed
- Get account balance
- Sign and send transactions
- Manage balance updates

### GameManager
**Responsibility**: Tic-tac-toe game state and logic
- Setup and join games
- Track game board state
- Make moves on-chain
- Handle game end conditions
- Subscribe to game events
- Manage game statistics

### MatchmakingManager
**Responsibility**: Player matchmaking
- Join matchmaking queue
- Cancel matchmaking
- Track queue status

### TransactionManager
**Responsibility**: Transaction tracking and history
- Create transaction records
- Track transaction status
- Maintain transaction history
- Calculate transaction timing statistics

### UIManager
**Responsibility**: User interface updates
- Cache DOM elements
- Update connection status
- Update account information
- Show/hide game board
- Render transaction history
- Update block window
- Handle all DOM manipulations

## App Coordinator

The `App` class ties all managers together and:
- Initializes all managers
- Sets up event listeners
- Coordinates between managers
- Handles user interactions
- Manages application flow

## Benefits of This Architecture

1. **Separation of Concerns**: Each manager has a single, clear responsibility
2. **Maintainability**: Easy to find and fix bugs in specific areas
3. **Testability**: Each manager can be tested independently
4. **Reusability**: Managers can be reused in different contexts
5. **Scalability**: Easy to add new features without affecting existing code
6. **Readability**: Smaller files are easier to understand

## Development

To add new features:

1. Determine which manager(s) are affected
2. Add methods to the appropriate manager(s)
3. Update the App coordinator to wire things together
4. Update UIManager if DOM changes are needed

## Example: Adding a New Feature

To add a "Spectate Game" feature:

1. Add `spectateGame(gameId)` method to **GameManager**
2. Add UI elements in HTML
3. Add `showSpectateMode()` method to **UIManager**
4. Add event handler in **App** to coordinate

This keeps changes isolated and maintainable!

