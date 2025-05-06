import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// Tetris block component
const TetrisBlock = ({ color, size, x, y, type }) => {
  // Animation ref
  const fallAnim = useRef(new Animated.Value(-100)).current;
  
  // Start animation when component mounts - adjusted for better visibility
  useEffect(() => {
    const randomDelay = Math.random() * 2000;
    const randomDuration = 10000 + Math.random() * 6000; // Even faster animation
    
    Animated.loop(
      Animated.sequence([
        Animated.delay(randomDelay),
        Animated.timing(fallAnim, {
          toValue: height + 100,
          duration: randomDuration,
          useNativeDriver: true
        }),
        Animated.timing(fallAnim, {
          toValue: -150,
          duration: 0,
          useNativeDriver: true
        })
      ])
    ).start();
    
    return () => {
      fallAnim.stopAnimation();
    };
  }, []);

  // Different block shapes
  const renderShape = () => {
    switch(type) {
      case 'I':
        return (
          <>
            <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
            <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginTop: 1 }]} />
            <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginTop: 1 }]} />
            <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginTop: 1 }]} />
          </>
        );
      case 'T':
        return (
          <>
            <View style={{ flexDirection: 'row' }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
            </View>
            <View style={{ alignItems: 'center', marginTop: 1 }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
            </View>
          </>
        );
      case 'O':
        return (
          <>
            <View style={{ flexDirection: 'row' }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 1 }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
            </View>
          </>
        );
      case 'L':
        return (
          <>
            <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
            <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginTop: 1 }]} />
            <View style={{ flexDirection: 'row', marginTop: 1 }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
            </View>
          </>
        );
      case 'Z':
        return (
          <>
            <View style={{ flexDirection: 'row' }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 1, marginLeft: size + 1 }}>
              <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />
              <View style={[styles.block, { width: size, height: size, backgroundColor: color, marginLeft: 1 }]} />
            </View>
          </>
        );
      default:
        return <View style={[styles.block, { width: size, height: size, backgroundColor: color }]} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.tetrisBlockContainer,
        { 
          left: x, 
          transform: [{ translateY: fallAnim }],
          opacity: 0.7
        }
      ]}
    >
      {renderShape()}
    </Animated.View>
  );
};

export default function TetrisHomeScreen() {
  // Create an array of random tetris blocks - adjusted for better visibility
  const blockSize = Math.min(width, height) * 0.075; // Larger block size for better visibility
  const blocks = [
    { id: 1, color: '#FF0080', size: blockSize, x: width * 0.15, type: 'T' },
    { id: 2, color: '#00FFFF', size: blockSize, x: width * 0.65, type: 'I' },
    { id: 3, color: '#FFFF00', size: blockSize, x: width * 0.4, type: 'O' },
    { id: 4, color: '#00FF00', size: blockSize, x: width * 0.25, type: 'Z' },
    { id: 5, color: '#FF00FF', size: blockSize, x: width * 0.55, type: 'I' },
    { id: 6, color: '#FF8800', size: blockSize, x: width * 0.75, type: 'L' },
    { id: 7, color: '#00FFAA', size: blockSize, x: width * 0.5, type: 'T' },
    { id: 8, color: '#8800FF', size: blockSize, x: width * 0.35, type: 'Z' },
    { id: 9, color: '#0088FF', size: blockSize, x: width * 0.2, type: 'L' },
    { id: 10, color: '#FF8888', size: blockSize, x: width * 0.8, type: 'O' },
  ];

  // SafeAreaView ensures content stays within viewable area
  return (
    <ThemedView style={styles.container}>
      {/* Dark background overlay for better visibility */}
      <View style={styles.darkOverlay} />
      {/* Background grid */}
      <View style={styles.grid}>
        {Array(20).fill().map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: i * 35 }]} />
        ))}
        {Array(12).fill().map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: i * 35 }]} />
        ))}
      </View>
      
      {/* Falling Tetris blocks */}
      {blocks.map(block => (
        <TetrisBlock 
          key={block.id} 
          color={block.color} 
          size={block.size} 
          x={block.x} 
          type={block.type} 
        />
      ))}
      
      {/* Play button */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => {
          console.log("Navigating to Tetris and initializing game state");
          router.push('/tetris');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF0080', '#FF2090']}
          style={styles.buttonGradient}
        >
          <ThemedText style={styles.playButtonText}>Play Tetris!</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Version text */}
      <View style={styles.versionContainer}>
        <ThemedText style={styles.versionText}>v1.0</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 0
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  grid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#3a3a5e',
    opacity: 0.3,
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  titleContainer: {
    position: 'absolute',
    top: height * 0.1,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  playButton: {
    width: Math.min(width * 0.6, 220),
    height: 60,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    zIndex: 10,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  playButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  versionContainer: {
    marginTop: 30,
  },
  versionText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  tetrisBlockContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  block: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});