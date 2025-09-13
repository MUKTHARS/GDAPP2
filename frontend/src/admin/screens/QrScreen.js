import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QrScreen({ route, navigation }) {
  const [qrData, setQrData] = useState(null);
  const [expiryTime, setExpiryTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQRId, setCurrentQRId] = useState(null);
  const [qrStats, setQrStats] = useState({
    maxCapacity: 15,
    currentUsage: 0,
    remainingSlots: 0,
    isNew: false,
    isFull: false
  });

  // Use refs to track state without causing re-renders
  const isAutoGeneratingRef = useRef(false);
  const currentQRIdRef = useRef(null);
  const qrStatsRef = useRef(qrStats);
  const expiryTimeRef = useRef('');
  const isScreenActiveRef = useRef(true);
  const intervalRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    currentQRIdRef.current = currentQRId;
    qrStatsRef.current = qrStats;
    expiryTimeRef.current = expiryTime;
  }, [currentQRId, qrStats, expiryTime]);

  // Track screen focus state
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      isScreenActiveRef.current = true;
      // Refresh data when screen comes into focus
      if (!isLoading) {
        fetchQR(false, false);
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      isScreenActiveRef.current = false;
      // Stop any auto-generation when screen loses focus
      isAutoGeneratingRef.current = false;
      // Clear interval when screen is not visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      // Clean up interval on component unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [navigation, isLoading]);

  if (!route?.params?.venue?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: Invalid venue data</Text>
        <Button 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
        />
      </View>
    );
  }

  const { venue } = route.params;

  // Get stored QR data for this venue
const getStoredQR = async () => {
  try {
    const authData = await AsyncStorage.getItem('admin_auth_data');
    if (authData) {
      const { user_id } = JSON.parse(authData);
      const storedData = await AsyncStorage.getItem(`qr_${venue.id}_${user_id}`);
      if (storedData) {
        const { qrData, expiry, qrId, isFull } = JSON.parse(storedData);
        // Return stored QR regardless of fullness for display
        if (new Date(expiry) > new Date()) {
          return { qrData, expiry, qrId, isFull };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting stored QR:', error);
    return null;
  }
};

const storeQR = async (qrData, expiry, qrId, isFull = false) => {
  try {
    const authData = await AsyncStorage.getItem('admin_auth_data');
    if (authData) {
      const { user_id } = JSON.parse(authData);
      await AsyncStorage.setItem(`qr_${venue.id}_${user_id}`, JSON.stringify({
        qrData,
        expiry,
        qrId,
        isFull
      }));
    }
  } catch (error) {
    console.error('Error storing QR:', error);
  }
};

  // Safe date conversion function to prevent "Date value out of bounds" error
  const safeToISOString = (dateString) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return new Date().toISOString(); // Return current date as fallback
      }
      return date.toISOString();
    } catch (error) {
      console.error('Error converting date to ISO string:', error);
      return new Date().toISOString(); // Return current date as fallback
    }
  };

  const fetchQR = async (forceNew = false, isAutoGenerate = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For manual refresh or initial load, use stored QR if available
      if (!forceNew && !isAutoGenerate) {
        const stored = await getStoredQR();
        if (stored) {
          setQrData(stored.qrData);
          setExpiryTime(new Date(stored.expiry).toLocaleTimeString());
          setCurrentQRId(stored.qrId);
          
          const isFull = stored.isFull || false;
          setQrStats(prev => ({
            ...prev,
            isFull: isFull,
            currentUsage: isFull ? 15 : 0 // Set usage to 2 if full
          }));

          // If stored QR is full and this is auto-generation, skip to generate new one
          if (isFull && isAutoGenerate) {
            console.log('Stored QR is full, proceeding to generate new one...');
            // Continue to generate new QR
          } else {
            setIsLoading(false);
            return;
          }
        }
      }

      // Add validation for venue ID
      if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
        throw new Error('Invalid venue information');
      }

      const params = { 
        venue_id: venue.id.toString(),
        force_new: forceNew
      };
      
      // Add auto_generate parameter only for true auto-generation
      if (isAutoGenerate) {
        params.auto_generate = 'true';
      }

      const response = await api.get('/admin/qr', {
        params: params,
        timeout: 24000
      });
      
      if (response.data?.qr_string) {
        const expiry = new Date(response.data.expires_at);
        
        setQrData(response.data.qr_string);
        setExpiryTime(expiry.toLocaleTimeString());
        setCurrentQRId(response.data.qr_id);
        
        // Update stats
        const maxCapacity = response.data.max_capacity || 15;
        const currentUsage = response.data.current_usage || 0;
        const remainingSlots = maxCapacity - currentUsage;
        const isFull = response.data.is_full || (remainingSlots === 0);
        const isNew = response.data.is_new || false;
        
        setQrStats({
          maxCapacity: maxCapacity,
          currentUsage: currentUsage,
          remainingSlots: remainingSlots,
          isNew: isNew,
          isFull: isFull
        });
        
        // Store the new QR code using safe date conversion
        const safeExpiryISO = safeToISOString(response.data.expires_at);
        await storeQR(response.data.qr_string, safeExpiryISO, response.data.qr_id, isFull);
        
        // Show alert if this is a new QR code (only for manual generation)
        if (isNew && !isAutoGenerate) {
          Alert.alert(
            'New QR Code Generated',
            'A new QR code has been created for this venue.',
            [{ text: 'OK' }]
          );
        }

        // Reset auto-generating flag
        isAutoGeneratingRef.current = false;
      } else {
        throw new Error(response.data?.error || 'Invalid QR data received');
      }
    } catch (error) {
      console.error('QR Generation Error:', error.message);
      setError(error.message);
      isAutoGeneratingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if we need to auto-generate new QR
const checkAutoGeneration = async () => {
  if (!isScreenActiveRef.current || isAutoGeneratingRef.current || !currentQRIdRef.current) {
    return;
  }

  try {
    const statsResponse = await api.get('/admin/qr/manage', {
      params: { venue_id: venue.id }
    });
    
    if (statsResponse.data && Array.isArray(statsResponse.data)) {
      const currentQR = statsResponse.data.find(qr => qr.id === currentQRIdRef.current);
      if (currentQR) {
        const isFull = currentQR.current_usage >= currentQR.max_capacity;
        
        // Update UI state
        setQrStats(prev => ({
          ...prev,
          currentUsage: currentQR.current_usage,
          remainingSlots: currentQR.remaining,
          isFull: isFull
        }));
        
        // Update storage
        const safeExpiryISO = safeToISOString(expiryTimeRef.current);
        await storeQR(qrData, safeExpiryISO, currentQRIdRef.current, isFull);
        
        // Auto-generate only if QR is completely full and not already generating
        if (isFull && !isAutoGeneratingRef.current && isScreenActiveRef.current) {
          console.log('QR is full, auto-generating new one...');
          isAutoGeneratingRef.current = true;
          await fetchQR(true, true);
        }
      }
    }
  } catch (error) {
    console.error('Error checking QR status:', error);
  }
};

const checkQRStatus = async () => {
  if (!isScreenActiveRef.current || !currentQRIdRef.current) {
    return;
  }

  try {
    // Get QR management data for this venue
    const response = await api.get('/admin/qr/manage', {
      params: { venue_id: venue.id }
    });
    
    if (response.data && Array.isArray(response.data)) {
      // Find the current QR code
      const currentQR = response.data.find(qr => qr.id === currentQRIdRef.current);
      
      if (currentQR) {
        const maxCapacity = currentQR.max_capacity || 15;
        const currentUsage = currentQR.current_usage || 0;
        const remainingSlots = maxCapacity - currentUsage;
        const isFull = currentQR.is_full || (remainingSlots === 0);
        
        // Update UI state
        setQrStats(prev => ({
          ...prev,
          currentUsage: currentUsage,
          remainingSlots: remainingSlots,
          isFull: isFull
        }));
        
        // Update storage
        const safeExpiryISO = safeToISOString(expiryTimeRef.current);
        await storeQR(qrData, safeExpiryISO, currentQRIdRef.current, isFull);
        
        console.log(`QR Status: ${currentUsage}/${maxCapacity} (${remainingSlots} remaining)`);
      }
    }
  } catch (error) {
    console.error('Error checking QR status:', error);
  }
};

  // Initial load
useEffect(() => {
  fetchQR(false, false);
  
  // Set up interval for status checks
  const statusInterval = setInterval(() => {
    if (isScreenActiveRef.current) {
      checkQRStatus(); // Check current QR status
      checkAutoGeneration(); // Check if need to auto-generate
    }
  }, 3000); // Check every 3 seconds

  return () => {
    clearInterval(statusInterval);
  };
}, [venue?.id]);


  return (
    <View style={styles.container}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <Text style={styles.capacity}>Venue Capacity: {venue.capacity}</Text>
      
      {qrStats.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW QR CODE</Text>
        </View>
      )}
   
      {isLoading ? (
        <Text>Loading QR code...</Text>
      ) : error ? (
        <Text style={styles.error}>Error: {error}</Text>
      ) : qrData ? (
        <>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={250}
              color="black"
              backgroundColor="white"
              // logo={require('../assets/images/logo.png')}
              logoSize={40}
              logoMargin={2}
              logoBorderRadius={8}
              logoBackgroundColor="transparent"
            />
          </View>
          <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
         <View style={styles.capacityInfo}>
  <Text style={[
    styles.capacityText,
    qrStats.isFull && styles.fullText
  ]}>
    Scanned: {qrStats.currentUsage} times
  </Text>
  <Text style={[
    styles.capacityText,
    qrStats.isFull && styles.fullText
  ]}>
    Capacity: {qrStats.currentUsage}/{qrStats.maxCapacity}
  </Text>
  <Text style={[
    styles.capacityText,
    qrStats.isFull && styles.fullText
  ]}>
    Remaining: {qrStats.remainingSlots} slots
  </Text>
  {qrStats.isFull && (
    <View style={styles.fullWarningContainer}>
      <Text style={styles.fullWarning}>
        This QR is full. {qrStats.currentUsage === qrStats.maxCapacity ? 
          'New QR generating...' : 'Scanning may fail.'}
      </Text>
    </View>
  )}
</View>
        </>
      ) : (
        <Text>No QR data available</Text>
      )}

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => fetchQR(false, false)}
        disabled={isLoading}
      >
        <Icon name="refresh" size={24} color="#2e86de" />
        <Text style={styles.refreshText}>Refresh Status</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.refreshButton, { marginTop: 10 }]}
        onPress={() => fetchQR(true, false)}
        disabled={isLoading}
      >
        <Icon name="add" size={24} color="#ff4757" />
        <Text style={[styles.refreshText, { color: '#ff4757' }]}>
          Generate New QR
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  venueName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  capacity: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  newBadge: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  newBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  qrContainer: {
    marginVertical: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  expiry: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
    fontWeight: '500',
  },
  capacityInfo: {
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  capacityText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
    fontWeight: '600',
  },
  fullText: {
    color: 'red',
    fontWeight: 'bold',
  },
  fullWarningContainer: {
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe6e6',
  },
  fullWarning: {
    color: '#e53e3e',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f8ff',
    borderRadius: 8,
    marginTop: 10,
  },
  refreshText: {
    marginLeft: 10,
    color: '#2e86de',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginVertical: 20,
    textAlign: 'center',
    fontWeight: '500',
  }
});

