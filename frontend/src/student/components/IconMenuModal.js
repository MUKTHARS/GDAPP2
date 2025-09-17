import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CommonActions } from '@react-navigation/native';
import auth from '../services/auth';

const IconMenuModal = ({ visible, onClose, navigation }) => {
  const [confirmNavigation, setConfirmNavigation] = useState(null);
  const menuItems = [
    { name: 'SessionBooking', icon: 'home', label: 'Home' },
    { name: 'QrScanner', icon: 'qr-code-scanner', label: 'Scan QR' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  // List of session screens where confirmation is required
  const sessionScreens = ['Lobby', 'GdSession', 'Survey', 'Waiting', 'Results'];

  const getCurrentScreen = () => {
    const state = navigation.getState();
    return state.routes[state.index]?.name;
  };

  const handleNavigation = (screenName) => {
    const currentScreen = getCurrentScreen();
    
    // Check if user is in a session screen and trying to navigate to non-session screen
    if (sessionScreens.includes(currentScreen) && !sessionScreens.includes(screenName)) {
      setConfirmNavigation(screenName);
      Alert.alert(
        'Leave Session?',
        'Are you sure you want to leave the current session? This action may affect your participation.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setConfirmNavigation(null)
          },
          {
            text: 'Yes, Leave',
            style: 'destructive',
            onPress: () => {
              navigateToScreen(screenName);
              setConfirmNavigation(null);
            }
          }
        ]
      );
    } else {
      navigateToScreen(screenName);
    }
  };

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
    onClose();
  };

  const handleLogout = async () => {
    const currentScreen = getCurrentScreen();
    
    // Check if user is in a session screen
    if (sessionScreens.includes(currentScreen)) {
      Alert.alert(
        'Leave Session to Logout?',
        'You are currently in a session. Are you sure you want to logout? This will remove you from the session.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Yes, Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await auth.logout();
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  })
                );
              } catch (error) {
                console.error('Logout failed:', error);
                Alert.alert('Error', 'Failed to logout');
              }
            }
          }
        ]
      );
    } else {
      try {
        await auth.logout();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      } catch (error) {
        console.error('Logout failed:', error);
        Alert.alert('Error', 'Failed to logout');
      }
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.name)}
              activeOpacity={0.8}
              disabled={confirmNavigation === item.name}
            >
              <View style={styles.menuItemGradient}>
                <Icon name={item.icon} size={24} color="#F8FAFC" />
              </View>
            </TouchableOpacity>
          ))}
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={[styles.menuItemGradient, styles.logoutButton]}>
              <Icon name="exit-to-app" size={24} color="#F8FAFC" />
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 27, 0.7)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingLeft: 15,
  },
  menuContainer: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    backgroundColor: '#1E293B',
  },
  menuItem: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  menuItemGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#4F46E5',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
  },
  divider: {
    height: 1,
    width: '80%',
    marginVertical: 12,
    borderRadius: 0.5,
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
  },
});

export default IconMenuModal;