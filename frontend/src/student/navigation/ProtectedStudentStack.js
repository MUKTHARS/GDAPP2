// student/navigation/ProtectedStudentStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AppSwitchBlocker from '../components/AppSwitchBlocker';
import StudentStack from './StudentStack';

const Stack = createStackNavigator();

// Create a modified AppSwitchBlocker that excludes certain screens
const SelectiveAppSwitchBlocker = (WrappedComponent) => {
  return (props) => {
    // Get the current route name from navigation state
    const currentRoute = props.navigation?.getState()?.routes?.[props.navigation?.getState()?.index]?.name;
    
    // Don't apply blocking to these screens
    const excludedScreens = ['SessionBooking', 'QrScanner'];
    
    if (excludedScreens.includes(currentRoute)) {
      return <WrappedComponent {...props} />;
    }
    
    // Apply AppSwitchBlocker to other screens
    const ProtectedComponent = AppSwitchBlocker(WrappedComponent);
    return <ProtectedComponent {...props} />;
  };
};

const ProtectedStudentStack = ({ onAdminSwitch }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProtectedStudentStack" options={{ headerShown: false }}>
        {(props) => (
          <StudentStack 
            {...props} 
            onAdminSwitch={onAdminSwitch} 
            screenOptions={{ 
              unmountOnBlur: true // This helps with state management
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Apply SelectiveAppSwitchBlocker instead of regular AppSwitchBlocker
const ProtectedStack = SelectiveAppSwitchBlocker(ProtectedStudentStack);

export default ProtectedStack;