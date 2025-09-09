import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CommonActions } from '@react-navigation/native';
import auth from '../services/auth';

const IconMenuModal = ({ visible, onClose, navigation }) => {
  const menuItems = [
    { name: 'SessionBooking', icon: 'home', label: 'Home' },
    { name: 'QrScanner', icon: 'qr-code-scanner', label: 'Scan QR' },
      { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  const handleNavigation = (screenName) => {
    navigation.navigate(screenName);
    onClose();
  };

  const handleLogout = async () => {
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