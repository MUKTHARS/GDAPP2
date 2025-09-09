// Updated globalStyles.js with minimalist theme
import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const globalStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Changed from '#f8f9fa' to pure white
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Typography
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    color: '#2D3748',
    textAlign: 'center',
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    color: '#4A5568',
    fontFamily: 'System',
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#718096',
    fontFamily: 'System',
  },
  
  // Buttons
  button: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  primaryButton: {
    backgroundColor: '#2D3748', // Changed from blue to dark gray
  },
  secondaryButton: {
    backgroundColor: '#E2E8F0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  secondaryButtonText: {
    color: '#4A5568',
  },
  
  // Inputs
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 14,
    marginBottom: 15,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    fontFamily: 'System',
  },
  
  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Utility
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // New unified styles
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff', // Changed from '#f8f9fa' to pure white
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
    fontFamily: 'System',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
    fontFamily: 'System',
  },
  section: {
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
});

// Updated color palette for minimalist theming
export const colors = {
  primary: '#2D3748', // Changed from blue to dark gray
  primaryLight: '#4A5568', // Changed from blue to medium gray
  primaryDark: '#1A202C', // Changed from blue to darker gray
  secondary: '#E2E8F0',
  success: '#48BB78',
  danger: '#F56565',
  warning: '#ECC94B',
  info: '#2D3748', // Changed from blue to dark gray
  light: '#ffffff', // Changed from '#f8f9fa' to pure white
  dark: '#2D3748',
  white: '#fff',
  black: '#000',
  gray: {
    100: '#F7FAFC',
    200: '#EDF2F7',
    300: '#E2E8F0',
    400: '#CBD5E0',
    500: '#A0AEC0',
    600: '#718096',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  },
};

// Common shadow styles
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
};

export const layout = {
  window: {
    width,
    height,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

// // C:\xampp\htdocs\GDAPPC\frontend\src\student\assets\globalStyles.js
// import { StyleSheet } from 'react-native';

// export const globalStyles = StyleSheet.create({
//   // Layout
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#fff',
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//   },
  
//   // Typography
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#2e86de',
//   },
//   subtitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 15,
//     color: '#333',
//   },
//   bodyText: {
//     fontSize: 16,
//     lineHeight: 24,
//     color: '#555',
//   },
  
//   // Buttons
//   button: {
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginVertical: 10,
//   },
//   primaryButton: {
//     backgroundColor: '#2e86de',
//   },
//   secondaryButton: {
//     backgroundColor: '#f0f0f0',
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   secondaryButtonText: {
//     color: '#333',
//   },
  
//   // Inputs
//   input: {
//     height: 50,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     marginBottom: 15,
//     paddingHorizontal: 15,
//     fontSize: 16,
//     backgroundColor: '#f9f9f9',
//   },
  
//   // Cards
//   card: {
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     padding: 15,
//     marginBottom: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
  
//   // Utility
//   center: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   spaceBetween: {
//     justifyContent: 'space-between',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// // Color palette for consistent theming
// export const colors = {
//   primary: '#2e86de',
//   secondary: '#f0f0f0',
//   success: '#4CAF50',
//   danger: '#F44336',
//   warning: '#FFC107',
//   info: '#2196F3',
//   light: '#f8f9fa',
//   dark: '#343a40',
//   white: '#fff',
//   black: '#000',
// };

// // Common shadow styles
// export const shadows = {
//   small: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   medium: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.15,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   large: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//     elevation: 5,
//   },
// };