import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Animated, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HeaderWithMenu = () => {
  const navigation = useNavigation();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));

  const toggleSideMenu = () => {
    if (showSideMenu) {
      Animated.timing(slideAnim, {
        toValue: -250,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSideMenu(false));
    } else {
      setShowSideMenu(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

const menuItems = [
  { title: 'Dashboard', screen: 'Dashboard' },
  { title: 'Venue Management', screen: 'VenueSetup' },
   { title: 'Session Config', screen: 'SessionConfig' },
   { title: 'Session Rules', screen: 'SessionRules' },
    { title: 'Session Calendar', screen: 'SessionCalendar' },
    { title: 'Student Progress', screen: 'StudentProgress' },
    { title: 'Question Bank', screen: 'QuestionBank' },
    { title: 'Analytics', screen: 'Analytics' },
    { title: 'Bulk Sesison', screen: 'Bulk Session' },
  ];

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={toggleSideMenu} style={styles.hamburgerButton}>
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
      </TouchableOpacity>
      
      {showSideMenu && (
        <Modal
          visible={showSideMenu}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowSideMenu(false)}
        >
          <TouchableOpacity 
            style={styles.overlay} 
            activeOpacity={1} 
            onPress={() => toggleSideMenu()}
          >
            <Animated.View 
              style={[
                styles.sideMenu,
                {
                  transform: [{ translateX: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                <Text style={styles.menuHeader}>Menu</Text>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() => {
                      navigation.navigate(item.screen);
                      toggleSideMenu();
                    }}
                  >
                    <Text style={styles.menuItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2e86de',
    marginBottom: 20,
  },
  menuHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2e86de',
  },
  hamburgerButton: {
    padding: 10,
  },
  hamburgerLine: {
    width: 25,
    height: 3,
    backgroundColor: 'white',
    marginVertical: 2,
    borderRadius: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'white',
    paddingTop: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2e86de',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
};

export default HeaderWithMenu;