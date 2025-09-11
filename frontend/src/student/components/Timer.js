import React, { useEffect, useState, useRef } from 'react';
import { Text, StyleSheet, AppState } from 'react-native';

const Timer = ({ duration, onComplete, active = true, initialTimeRemaining, onTick }) => {
  const [remaining, setRemaining] = useState(initialTimeRemaining || duration);
  const [endTime, setEndTime] = useState(null);
  const appState = useRef(AppState.currentState);
  const timerRef = useRef(null);
  const lastUpdateTime = useRef(Date.now()); // Add this ref to track last update time

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (initialTimeRemaining) {
      setRemaining(initialTimeRemaining);
      setEndTime(Date.now() + initialTimeRemaining * 1000);
    } else {
      setRemaining(duration);
      setEndTime(Date.now() + duration * 1000);
    }
  }, [duration, initialTimeRemaining]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came back to foreground, recalculate remaining time
        if (endTime) {
          const newRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
          setRemaining(newRemaining);
          if (onTick) onTick(newRemaining);
          lastUpdateTime.current = Date.now(); // Reset last update time
          
          if (newRemaining <= 0) {
            onComplete();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [endTime, onComplete, onTick]);

  useEffect(() => {
    if (!active || remaining <= 0 || !endTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      
      // Only update if at least 900ms have passed (to avoid double updates)
      if (timeSinceLastUpdate >= 900) {
        const newRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        setRemaining(newRemaining);
        if (onTick) onTick(newRemaining);
        lastUpdateTime.current = now; // Update last update time
        
        if (newRemaining <= 0) {
          onComplete();
        } else {
          // Calculate exact delay for next update to maintain 1-second intervals
          const nextUpdateDelay = 1000 - (timeSinceLastUpdate % 1000);
          timerRef.current = setTimeout(updateTimer, nextUpdateDelay);
        }
      } else {
        // If not enough time has passed, schedule check again soon
        timerRef.current = setTimeout(updateTimer, 100 - timeSinceLastUpdate);
      }
    };

    lastUpdateTime.current = Date.now(); // Initialize last update time
    timerRef.current = setTimeout(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [active, endTime, onComplete, onTick]);

  // Convert seconds to minutes:seconds format
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <Text style={styles.timerText}>
      {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
    </Text>
  );
}; 

const styles = StyleSheet.create({
  timerText: {
    fontSize: 60,           
    fontWeight: 'bold',
    color: '#FFFFFF',       
    textAlign: 'center',
    letterSpacing: 2,       
    textShadowColor: 'rgba(0, 0, 0, 0.6)', 
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
});

export default Timer;