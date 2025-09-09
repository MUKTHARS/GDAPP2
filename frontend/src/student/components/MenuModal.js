// src/student/components/MenuModal.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles, colors } from '../assets/globalStyles';
import { CommonActions } from '@react-navigation/native';
import auth from '../services/auth';
const MenuModal = ({ visible, onClose, navigation }) => {
  const menuItems = [
    { name: 'SessionBooking', title: 'Available Sessions', icon: 'event' },
    { name: 'QrScanner', title: 'Join Session', icon: 'qr-code-scanner' },
    { name: 'GdSession', title: 'GD Session', icon: 'group-work' },
    { name: 'Survey', title: 'Survey', icon: 'assignment' },
    { name: 'Results', title: 'Results', icon: 'poll' },
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Menu</Text>
            </View>
            
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.name)}
              >
                <Icon name={item.icon} size={24} color={colors.primary} />
                <Text style={styles.menuText}>{item.title}</Text>
                <Icon name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Icon name="exit-to-app" size={24} color={colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: '80%',
    backgroundColor: '#fff',
    height: '100%',
  },
   overlayTouchable: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuText: {
    marginLeft: 15,
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    color: colors.danger,
    fontWeight: '500',
  },
});

export default MenuModal;