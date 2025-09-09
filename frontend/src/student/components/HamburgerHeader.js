import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import IconMenuModal from './IconMenuModal';

const HamburgerHeader = ({ title, showMenu = true }) => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0a0f1bff" barStyle="light-content" />
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {showMenu && (
            <TouchableOpacity 
              onPress={() => setMenuVisible(true)}
              style={styles.menuButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
            >
              <View style={styles.menuButtonContainer}>
                <Icon name="menu" size={22} color="#F8FAFC" />
              </View>
            </TouchableOpacity>
          )}
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          {/* Empty view for balance when menu is hidden */}
          {!showMenu && <View style={styles.menuButton} />}
        </View>

        {/* Decorative bottom border */}
        <View style={styles.bottomBorder} />
      </View>

      <IconMenuModal 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 100,
  },
  headerContainer: {
    backgroundColor: '#0a0f1bff',
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuButtonContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: 30,
    height: 2,
    backgroundColor: '#4F46E5',
    marginTop: 4,
    borderRadius: 1,
    alignSelf: 'center',
  },
  bottomBorder: {
    height: 1,
    width: '100%',
    backgroundColor: '#1E293B',
  },
});

export default HamburgerHeader;