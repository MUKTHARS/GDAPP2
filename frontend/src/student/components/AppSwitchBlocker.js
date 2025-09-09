import React, { useEffect, useState } from 'react';
import { BackHandler, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_SWITCH_WARNING_KEY = 'app_switch_warning_count';

const AppSwitchBlocker = (WrappedComponent) => {
  return (props) => {
    const [appState, setAppState] = useState(AppState.currentState);
    const [warningCount, setWarningCount] = useState(0);

    useEffect(() => {
      // Load warning count from storage
      const loadWarningCount = async () => {
        try {
          const count = await AsyncStorage.getItem(APP_SWITCH_WARNING_KEY);
          setWarningCount(count ? parseInt(count) : 0);
        } catch (error) {
          console.error('Error loading warning count:', error);
        }
      };
      
      loadWarningCount();
    }, []);

    useEffect(() => {
      // Handle app state changes
      const handleAppStateChange = async (nextAppState) => {
        if (appState.match(/active|foreground/) && nextAppState === 'background') {
          // App is going to background (app switch)
          handleAppSwitch();
        }
        setAppState(nextAppState);
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      // Handle back button press
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevent default back behavior and show warning
        handleAppSwitch();
        return true;
      });

      return () => {
        subscription.remove();
        backHandler.remove();
      };
    }, [appState, warningCount]);

    const handleAppSwitch = async () => {
      if (warningCount >= 1) {
        // Second offense - eliminate from session
        Alert.alert(
          'Session Terminated',
          'You have been removed from the GD session due to repeated app switching.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Navigate to session booking and clear session data
                props.navigation.reset({
                  index: 0,
                  routes: [{ name: 'SessionBooking' }],
                });
                
                // Clear any session data if needed
                await AsyncStorage.removeItem(APP_SWITCH_WARNING_KEY);
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        // First offense - show warning
        Alert.alert(
          'Warning',
          'App switching is not allowed during GD sessions. If you switch apps again, you will be removed from the session.',
          [
            {
              text: 'I Understand',
              onPress: async () => {
                const newCount = warningCount + 1;
                setWarningCount(newCount);
                await AsyncStorage.setItem(APP_SWITCH_WARNING_KEY, newCount.toString());
              },
            },
          ],
          { cancelable: false }
        );
      }
    };

    return <WrappedComponent {...props} />;
  };
};

export default AppSwitchBlocker;