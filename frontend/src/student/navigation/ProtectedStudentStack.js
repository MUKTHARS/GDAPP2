// student/navigation/ProtectedStudentStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AppSwitchBlocker from '../components/AppSwitchBlocker';
import StudentStack from './StudentStack';

const Stack = createStackNavigator();

// Wrap all screen components with the AppSwitchBlocker
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

// Apply AppSwitchBlocker to all screens in the StudentStack
const ProtectedStack = AppSwitchBlocker(ProtectedStudentStack);

export default ProtectedStack;