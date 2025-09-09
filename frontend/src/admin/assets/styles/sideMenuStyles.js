// styles/sideMenuStyles.js
import { StyleSheet } from 'react-native';

export const sideMenuStyles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: '#2e86de',
  },
  hamburgerButton: {
    padding: 10,
    zIndex: 100,
  },
  hamburgerLine: {
    width: 25,
    height: 3,
    backgroundColor: '#333',
    margin: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'white',
    zIndex: 100,
  },
  menuHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
  },
});