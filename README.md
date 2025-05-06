# Tetris Expo

A modern implementation of the classic Tetris game built with React Native and Expo.

## Features

- Complete Tetris gameplay mechanics
- Responsive touch controls
  - Tap to move left/right
  - Double-tap to rotate
  - Swipe down for hard drop
- Next piece preview
- Score tracking and high score
- Level progression with increasing speed
- Line clearing with scoring system
- Game statistics (score, level, lines cleared)
- Modern blue gradient UI

## Controls

- **Move Left/Right**: Tap on the left/right side of the game board
- **Rotate Piece**: Double-tap anywhere on the board
- **Hard Drop**: Swipe down on the game board
- **Pause/Resume**: Tap the pause button
- **Reset Game**: Tap the reset button
- **Quit Game**: Tap the quit button

## Technical Implementation

- Built with React Native and Expo
- Uses React hooks for state management
- Custom game loop implementation
- Touch gesture handling with PanResponder
- Responsive design that works across different screen sizes
- Linear gradient backgrounds for visual appeal

## Game Mechanics

- Standard Tetris rules
- Seven classic tetromino shapes (I, J, L, O, S, T, Z)
- Level increases every 10 lines cleared
- Game speed increases with each level
- Score calculation based on:
  - Single line: 40 × level
  - Double line: 100 × level
  - Triple line: 300 × level
  - Tetris (4 lines): 1200 × level

## Installation

1. Make sure you have Node.js and npm installed
2. Install Expo CLI globally:
```
npm install -g expo-cli
```
3. Clone the repository:
```
git clone https://github.com/yourusername/tetris-expo.git
cd tetris-expo
```
4. Install dependencies:
```
npm install
```
5. Start the Expo development server:
```
npx expo start
```
6. Use the Expo Go app on your mobile device to scan the QR code, or run on a simulator

## Dependencies

- React Native
- Expo
- expo-linear-gradient
- @expo/vector-icons
- expo-router

## Future Improvements

- Add sound effects and background music
- Implement local storage for persistent high scores
- Add different game themes
- Add a settings screen for customization
- Implement a leaderboard feature
- Add haptic feedback for interactions

## License

MIT

## Credits

Created by Byron Gomez Jr @byrongomezjr, byrongomezjr@pm.me
