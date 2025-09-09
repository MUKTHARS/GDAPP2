// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Modal, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminStack from './admin/navigation/AdminStack';
import StudentStack from './student/navigation/StudentStack'; 
import AdminLoginScreen from './admin/screens/LoginScreen';

export default function App() {
  const [userRole, setUserRole] = useState('student');
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const role = await AsyncStorage.getItem('role');
          setUserRole(role || 'student');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAdminSwitch = () => {
    setShowAdminLogin(true);
  };

  const handleAdminLoginSuccess = () => {
    setUserRole('admin');
    setShowAdminLogin(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userRole === 'admin' ? (
        <AdminStack />
      ) : (
        <>
          <StudentStack onAdminSwitch={handleAdminSwitch} />
          <Modal
            visible={showAdminLogin}
            animationType="slide"
            transparent={false}
          >
            <AdminLoginScreen 
              onLoginSuccess={handleAdminLoginSuccess}
              onCancel={() => setShowAdminLogin(false)}
            />
          </Modal>
        </>
      )}
    </NavigationContainer>
  );
}