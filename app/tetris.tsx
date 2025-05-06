import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Constants for the game
const BOARD_ROWS = 20;
const BOARD_COLS = 10;
const WINDOW_WIDTH = Dimensions.get('window').width;
const WINDOW_HEIGHT = Dimensions.get('window').height;
const CELL_SIZE = Math.floor(Math.min(WINDOW_WIDTH * 0.8 / BOARD_COLS, WINDOW_HEIGHT * 0.04));
const TICK_SPEED = 1000; // Increase to 1000ms for slower initial descent
const HIGH_SCORE_KEY = 'tetris_high_score';

// Define types for our tetrominos
type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
type TetrominoShape = number[][];
type TetrominoColor = string;

interface Tetromino {
  shape: TetrominoShape;
  color: TetrominoColor;
}

interface Position {
  x: number;
  y: number;
}

// Tetromino shapes and colors
const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00F0F0'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0000F0'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#F0A000'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#F0F000'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#00F000'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#A000F0'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#F00000'
  }
};

// Get a random tetromino
const getRandomTetromino = (): Tetromino => {
  const tetrominos = Object.keys(TETROMINOS) as TetrominoType[];
  const randomTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
  return TETROMINOS[randomTetromino];
};

// Main Tetris game component
export default function TetrisScreen() {
  // Game state
  const [board, setBoard] = useState<(string | null)[][]>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position>({ x: 0, y: 0 });
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [linesCleared, setLinesCleared] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  
  const gameInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef = useRef<View>(null);
  const lastTapTime = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const boardPositionRef = useRef<{ x: number, y: number, width: number, height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // PanResponder setup for touch gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (evt) => {
        touchStartY.current = evt.nativeEvent.pageY;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gameOver || isPaused || !gameStarted) return;
        
        // Check if touch is within board bounds
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        
        if (
          touchX >= boardPositionRef.current.x && 
          touchX <= boardPositionRef.current.x + boardPositionRef.current.width &&
          touchY >= boardPositionRef.current.y && 
          touchY <= boardPositionRef.current.y + boardPositionRef.current.height
        ) {
          // Handle left/right movement - use threshold to prevent constant triggering
          if (Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
            if (gestureState.dx > 0) {
              movePiece(1, 0); // Move right
            } else {
              movePiece(-1, 0); // Move left
            }
            return true;
          }
          
          // Handle swipe down for hard drop
          if (gestureState.dy > 40 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
            hardDrop();
            return true;
          }
        }
        return false;
      },
      onPanResponderRelease: (evt) => {
        if (gameOver || isPaused || !gameStarted) return;
        
        // Handle tap (for rotation)
        const now = Date.now();
        if (
          Math.abs(evt.nativeEvent.pageY - touchStartY.current) < 10 && 
          now - lastTapTime.current < 300
        ) {
          rotatePiece();
        }
        lastTapTime.current = now;
      }
    })
  ).current;

  // Create an empty board
  function createEmptyBoard(): (string | null)[][] {
    return Array.from({ length: BOARD_ROWS }, () => 
      Array.from({ length: BOARD_COLS }, () => null)
    );
  }

  // Initialize the game
  useEffect(() => {
    console.log("Component mounted, initializing game immediately");
    // Start a new game right when the component mounts
    startNewGame();
    
    // Clean up on unmount
    return () => {
      console.log("Component unmounting, cleaning up");
      if (gameInterval.current) {
        clearInterval(gameInterval.current);
        gameInterval.current = null;
      }
    };
  }, []);
  
  // Start a new game
  function startNewGame() {
    console.log("Starting new game");
    
    // Clear any existing interval
    if (gameInterval.current) {
      clearInterval(gameInterval.current);
      gameInterval.current = null;
    }
    
    // Create initial pieces
    const first = getRandomTetromino();
    const second = getRandomTetromino();
    
    // Set initial position
    const startX = Math.floor((BOARD_COLS / 2) - Math.floor(first.shape[0].length / 2));
    const newPosition = { x: startX, y: 0 };
    
    // Reset game state all at once to prevent state update issues
    const emptyBoard = createEmptyBoard();
    
    // Set all state together to avoid race conditions
    setBoard(emptyBoard);
    setCurrentPiece(first);
    setNextPiece(second);
    setCurrentPosition(newPosition);
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    
    console.log("State initialized with piece:", first, "position:", newPosition, "gameStarted: true");
    
    // Start traditional game loop after a brief delay to ensure state is set
    setTimeout(() => {
      if (gameInterval.current) {
        clearInterval(gameInterval.current);
      }
      
      const speed = Math.max(300, TICK_SPEED - (1 - 1) * 50);
      console.log(`Starting simple game loop with speed: ${speed}ms at level 1`);
      
      // Use a simpler interval that just calls moveDown()
      gameInterval.current = setInterval(() => {
        console.log("Game tick - calling moveDown() directly");
        moveDown();
      }, speed);
    }, 1000);
  }
  
  // Update game speed when level changes
  useEffect(() => {
    if (gameStarted && !gameOver) {
      console.log(`Level changed to ${level}, updating game speed`);
      
      // Clear existing interval
      if (gameInterval.current) {
        clearInterval(gameInterval.current);
      }
      
      // Calculate new speed based on level
      const speed = Math.max(300, TICK_SPEED - (level - 1) * 50);
      console.log(`Setting new game speed: ${speed}ms at level ${level}`);
      
      // Start new interval with updated speed
      gameInterval.current = setInterval(() => {
        console.log("Game tick - calling moveDown() directly");
        moveDown();
      }, speed);
    }
  }, [level]);
  
  // Separate function for moving down to ensure consistency
  function moveDown() {
    if (gameOver || isPaused || !currentPiece) {
      console.log("Cannot move down:", { gameOver, isPaused, hasPiece: !!currentPiece });
      return;
    }
    
    const newPosition = {
      x: currentPosition.x,
      y: currentPosition.y + 1
    };
    
    console.log(`Moving piece down to: (${newPosition.x}, ${newPosition.y})`);
    
    if (!isCollision(currentPiece.shape, newPosition)) {
      setCurrentPosition(newPosition);
    } else {
      // If there's a collision, lock the piece
      console.log("Collision detected while moving down, locking piece");
      lockPiece();
    }
  }
  
  // Lock the piece and check for cleared lines
  function lockPiece() {
    if (!currentPiece || !gameStarted) return;
    
    console.log("Locking piece");
    // Copy the current board
    const newBoard = [...board.map(row => [...row])];
    
    // Place the piece on the board
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = y + currentPosition.y;
          const boardX = x + currentPosition.x;
          
          if (boardY >= 0 && boardY < BOARD_ROWS && boardX >= 0 && boardX < BOARD_COLS) {
            newBoard[boardY][boardX] = currentPiece.color;
          }
        }
      }
    }
    
    // Check for cleared lines
    let newLinesCleared = 0;
    for (let y = BOARD_ROWS - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== null)) {
        // Clear this line
        newBoard.splice(y, 1);
        newBoard.unshift(Array(BOARD_COLS).fill(null));
        newLinesCleared++;
        y++; // Check the same row again
      }
    }
    
    // Update score and lines cleared
    if (newLinesCleared > 0) {
      const linePoints = [0, 40, 100, 300, 1200];
      const newScore = score + linePoints[Math.min(newLinesCleared, 4)] * level;
      setScore(newScore);
      setLinesCleared(prev => prev + newLinesCleared);
      
      // Update level based on lines cleared (every 10 lines)
      const totalLines = linesCleared + newLinesCleared;
      const newLevel = Math.floor(totalLines / 10) + 1;
      
      if (newLevel > level) {
        setLevel(newLevel);
      }
    }
    
    setBoard(newBoard);
    console.log("Generating new piece after lock");
    generateNewPiece();
  }
  
  // Generate a new piece
  function generateNewPiece() {
    if (!nextPiece) return;
    
    const newPiece = nextPiece;
    const nextRandomPiece = getRandomTetromino();
    
    const shapeWidth = newPiece.shape[0].length;
    const startX = Math.floor((BOARD_COLS / 2) - Math.floor(shapeWidth / 2));
    const newPosition = { x: startX, y: 0 };
    
    setCurrentPiece(newPiece);
    setNextPiece(nextRandomPiece);
    setCurrentPosition(newPosition);
    
    // Check if game is over (no space for new piece)
    if (isCollision(newPiece.shape, newPosition)) {
      console.log("Game over detected: new piece cannot be placed");
      setGameOver(true);
      setGameStarted(false);
      
      if (gameInterval.current) {
        clearInterval(gameInterval.current);
        gameInterval.current = null;
      }
      
      // Update high score if needed
      if (score > highScore) {
        setHighScore(score);
      }
    }
  }
  
  // Move the piece
  function movePiece(deltaX: number, deltaY: number) {
    if (gameOver || isPaused || !currentPiece || !gameStarted) {
      console.log("Cannot move:", { gameOver, isPaused, hasPiece: !!currentPiece, gameStarted });
      return;
    }
    
    // If moving down, use the dedicated function for consistency
    if (deltaY > 0) {
      moveDown();
      return;
    }
    
    // Otherwise handle horizontal movement
    const newPosition = {
      x: currentPosition.x + deltaX,
      y: currentPosition.y
    };
    
    console.log(`Moving piece horizontally to: (${newPosition.x}, ${newPosition.y})`);
    
    if (!isCollision(currentPiece.shape, newPosition)) {
      // Update React state with the new position
      setCurrentPosition(newPosition);
    }
  }
  
  // Start the game loop with a speed based on level
  function startGameLoop() {
    console.log("Starting game loop function called, current state:", { 
      isPaused, 
      gameOver, 
      gameStarted, 
      hasPiece: !!currentPiece,
      position: currentPosition
    });
    
    if (gameInterval.current) {
      clearInterval(gameInterval.current);
      gameInterval.current = null;
    }
    
    // Initialize a piece if we don't have one but should
    if (!currentPiece && gameStarted && !gameOver) {
      console.log("No current piece but game is started, generating one");
      const newPiece = getRandomTetromino();
      const nextRandomPiece = getRandomTetromino();
      
      const startX = Math.floor((BOARD_COLS / 2) - Math.floor(newPiece.shape[0].length / 2));
      setCurrentPiece(newPiece);
      setNextPiece(nextRandomPiece);
      setCurrentPosition({ x: startX, y: 0 });
      
      console.log("Generated new piece:", newPiece);
    }
    
    // Decrease interval time as level increases (increase speed)
    const speed = Math.max(300, TICK_SPEED - (level - 1) * 50);
    console.log(`Starting game loop with speed: ${speed}ms at level ${level}`);
    
    gameInterval.current = setInterval(() => {
      console.log("Game tick - calling moveDown() directly");
      moveDown();
    }, speed);
  }

  // Rotate the piece
  function rotatePiece() {
    if (gameOver || isPaused || !currentPiece || !gameStarted) return;
    
    const rotatedShape = rotateMatrix(currentPiece.shape);
    
    // Try normal rotation
    if (!isCollision(rotatedShape, currentPosition)) {
      setCurrentPiece({
        ...currentPiece,
        shape: rotatedShape
      });
      return;
    }
    
    // Wall kick: try shifting piece if rotation causes collision
    const kicks = [-1, 1, -2, 2]; // Try these x-offsets
    for (const kick of kicks) {
      const kickedPosition = {
        ...currentPosition,
        x: currentPosition.x + kick
      };
      
      if (!isCollision(rotatedShape, kickedPosition)) {
        setCurrentPiece({
          ...currentPiece,
          shape: rotatedShape
        });
        setCurrentPosition(kickedPosition);
        return;
      }
    }
  }

  // Helper function to rotate a matrix
  function rotateMatrix(matrix: TetrominoShape): TetrominoShape {
    const N = matrix.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(0));
    
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        rotated[x][N - 1 - y] = matrix[y][x];
      }
    }
    
    return rotated;
  }

  // Hard drop - move piece all the way down immediately
  function hardDrop() {
    if (gameOver || isPaused || !currentPiece || !gameStarted) return;
    
    console.log("Hard dropping piece");
    let dropPosition = { ...currentPosition };
    
    // Move down until collision
    while (!isCollision(currentPiece.shape, { ...dropPosition, y: dropPosition.y + 1 })) {
      dropPosition.y += 1;
    }
    
    console.log(`Hard dropped to y=${dropPosition.y}`);
    setCurrentPosition(dropPosition);
    lockPiece();
  }

  // Check if there's a collision
  function isCollision(shape: TetrominoShape, position: Position): boolean {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        // Skip empty cells in the tetromino
        if (!shape[y][x]) continue;
        
        const boardX = x + position.x;
        const boardY = y + position.y;
        
        // Check boundaries
        if (
          boardX < 0 || 
          boardX >= BOARD_COLS ||
          boardY >= BOARD_ROWS
        ) {
          return true;
        }
        
        // Check for collisions with existing pieces on the board
        if (boardY >= 0 && board[boardY][boardX]) {
          return true;
        }
      }
    }
    return false;
  }

  // Render the next piece preview
  function renderNextPiece() {
    if (!nextPiece) return null;
    
    const shape = nextPiece.shape;
    const color = nextPiece.color;
    
    return (
      <View style={styles.nextPieceContainer}>
        <Text style={styles.nextPieceLabel}>NEXT</Text>
        <View style={styles.nextPiecePreview}>
          {shape.map((row, rowIndex) => (
            <View key={`preview-row-${rowIndex}`} style={styles.previewRow}>
              {row.map((cell, cellIndex) => (
                <View 
                  key={`preview-cell-${rowIndex}-${cellIndex}`} 
                  style={[
                    styles.previewCell, 
                    cell ? { backgroundColor: color } : { backgroundColor: 'transparent' }
                  ]} 
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Render the game board
  function renderBoard() {
    // Create a temporary board copy to overlay the active piece
    const displayBoard = board.map(row => [...row]);
    
    // Add current piece to the display board
    if (currentPiece && gameStarted) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = y + currentPosition.y;
            const boardX = x + currentPosition.x;
            
            if (boardY >= 0 && boardY < BOARD_ROWS && boardX >= 0 && boardX < BOARD_COLS) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }
    
    // Simple touch event handling as fallback if PanResponder fails
    const handleTouch = (event: GestureResponderEvent) => {
      if (gameOver || isPaused || !gameStarted) return;
      
      const touchX = event.nativeEvent.pageX;
      const boardWidth = boardPositionRef.current.width;
      const boardCenterX = boardPositionRef.current.x + boardWidth / 2;
      
      // Double tap to rotate
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        rotatePiece();
        lastTapTime.current = 0; // Reset to prevent triple tap
        return;
      }
      
      // Single tap to move left/right
      if (touchX < boardCenterX) {
        movePiece(-1, 0); // Move left
      } else {
        movePiece(1, 0); // Move right
      }
      
      lastTapTime.current = now;
    };
    
    return (
      <View 
        ref={boardRef}
        style={styles.board}
        onTouchStart={handleTouch}
        {...panResponder.panHandlers}
        onLayout={(event) => {
          const { width, height, x, y } = event.nativeEvent.layout;
          boardPositionRef.current = { 
            x, 
            y, 
            width, 
            height 
          };
          console.log(`Board positioned at: (${x}, ${y}) with size ${width}x${height}`);
        }}
      >
        {displayBoard.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, cellIndex) => (
              <View 
                key={`cell-${rowIndex}-${cellIndex}`} 
                style={[
                  styles.cell, 
                  cell ? { backgroundColor: cell, borderColor: cell, borderWidth: 1 } : null
                ]} 
              />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#1a237e', '#000033']}
      style={styles.container}
    >
      <Stack.Screen 
        options={{
          headerShown: false
        }} 
      />
      
      {/* Game stats area */}
      <View style={styles.statsArea}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LINES</Text>
          <Text style={styles.statValue}>{linesCleared}</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LEVEL</Text>
          <Text style={styles.statValue}>{level}</Text>
        </View>
        
        <View style={styles.scoreBox}>
          <View style={styles.crownContainer}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={styles.highScoreValue}>{highScore}</Text>
          </View>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>
      
      {/* Game play area */}
      <View style={styles.gameArea}>
        {renderBoard()}
        {renderNextPiece()}
      </View>
      
      {/* Game instructions */}
      <Text style={styles.instructions}>Tap to move • Double-tap to rotate • Swipe down to drop</Text>
      
      {/* Game controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Ionicons name={isPaused ? "play" : "pause"} size={24} color="#00BFFF" />
          <Text style={styles.controlButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={startNewGame}
        >
          <Ionicons name="refresh" size={24} color="#00BFFF" />
          <Text style={styles.controlButtonText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => router.back()}
        >
          <Ionicons name="exit-outline" size={24} color="#00BFFF" />
          <Text style={styles.controlButtonText}>Quit</Text>
        </TouchableOpacity>
      </View>
      
      {/* Game over overlay */}
      {gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.gameOverText}>Game Over</Text>
          <View style={styles.finalStatsContainer}>
            <Text style={styles.finalScore}>Score: {score}</Text>
            <Text style={styles.finalScore}>Level: {level}</Text>
            <Text style={styles.finalScore}>Lines: {linesCleared}</Text>
          </View>
          <TouchableOpacity 
            style={styles.gameButton} 
            onPress={startNewGame}
          >
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.gameButton, styles.homeButton]} 
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Home</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  statsArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statBox: {
    backgroundColor: '#0c1445',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#00BFFF',
    padding: 5,
    width: WINDOW_WIDTH * 0.25,
    alignItems: 'center',
  },
  statLabel: {
    color: '#00BFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statValue: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreBox: {
    backgroundColor: '#0c1445',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#00BFFF',
    padding: 5,
    width: WINDOW_WIDTH * 0.35,
    alignItems: 'center',
  },
  crownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highScoreValue: {
    color: '#FFD700',
    fontSize: 14,
    marginLeft: 5,
  },
  scoreValue: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  gameArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  board: {
    borderWidth: 2,
    borderColor: '#00BFFF',
    backgroundColor: 'rgba(12, 20, 69, 0.8)',
    padding: 1,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(12, 20, 69, 0.3)',
  },
  nextPieceContainer: {
    marginLeft: 15,
    width: WINDOW_WIDTH * 0.15,
    alignItems: 'center',
  },
  nextPieceLabel: {
    color: '#00BFFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  nextPiecePreview: {
    width: WINDOW_WIDTH * 0.15,
    height: WINDOW_WIDTH * 0.15,
    borderWidth: 2,
    borderColor: '#00BFFF',
    backgroundColor: 'rgba(12, 20, 69, 0.8)',
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRow: {
    flexDirection: 'row',
  },
  previewCell: {
    width: 10,
    height: 10,
    margin: 1,
  },
  instructions: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 'auto',
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: 'rgba(12, 20, 69, 0.8)',
    width: WINDOW_WIDTH * 0.25,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00BFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalStatsContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  finalScore: {
    color: 'white',
    fontSize: 24,
    marginBottom: 5,
  },
  gameButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginBottom: 10,
  },
  homeButton: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 