// src/admin/components/AdminMenuModal.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles, colors } from '../../student/assets/globalStyles';
import { CommonActions } from '@react-navigation/native';
import auth from '../../student/services/auth';

const AdminMenuModal = ({ visible, onClose, navigation }) => {
  const menuItems = [
    { name: 'Dashboard', title: 'Dashboard', icon: 'dashboard' },
    { name: 'VenueSetup', title: 'Venue Management', icon: 'place' },
     { name: 'TopicManager', title: 'TopicManager', icon: 'check-circle' },
    { name: 'SessionConfig', title: 'Session Config', icon: 'settings' },
    { name: 'TopParticipants', title: 'Top Performers', icon: 'rule' },
    // { name: 'SessionCalendar', title: 'Session Calendar', icon: 'calendar-today' },
    // { name: 'StudentProgress', title: 'Student Progress', icon: 'school' },
    { name: 'QuestionBank', title: 'Question Bank', icon: 'library-books' },
    // { name: 'Analytics', title: 'Analytics', icon: 'analytics' },
    // { name: 'Bulk Session', title: 'Bulk Session', icon: 'post-add' },
    { name: 'BookedStudents', title: 'Booked Students', icon: 'check-circle' },
    { name: 'RankingPointsConfig', title: 'Ranking Points Config', icon: 'trophy' },
     { name: 'AdminFeedbackScreen', title: 'Students Feedback', icon: 'school' },
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
              <Text style={styles.headerText}>Admin Menu</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    width: '80%',
    height: '100%',
    backgroundColor: '#fff',
  },
  scrollContainer: {
    paddingBottom: 80,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    color: colors.danger,
  },
});

export default AdminMenuModal;