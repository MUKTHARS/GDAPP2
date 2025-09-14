import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function QrCarousel({ venue, onClose }) {
  const [qrCodes, setQrCodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const position = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > width * 0.2) {
          if (gestureState.dx > 0 && currentIndex > 0) {
            // Swipe right - go to previous QR
            setCurrentIndex(currentIndex - 1);
          } else if (gestureState.dx < 0 && currentIndex < qrCodes.length - 1) {
            // Swipe left - go to next QR
            setCurrentIndex(currentIndex + 1);
          }
        }
        Animated.spring(position, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    // Add safety check for venue
    if (venue && venue.id) {
      fetchQRHistory();
    } else {
      setError('Invalid venue information');
      setIsLoading(false);
    }
  }, [venue]);

  const fetchQRHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add safety check for venue.id
      if (!venue || !venue.id) {
        throw new Error('Invalid venue information');
      }

      console.log('Fetching QR history for venue:', venue.id);
      const response = await api.admin.getQRHistory(venue.id);
      console.log('QR History API Response:', response);

      // Handle different response structures
      let qrData = [];
      let responseSuccess = false;
      
      if (response.data && response.data.success !== undefined) {
        // New format with success field
        responseSuccess = response.data.success;
        qrData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        // Old format - array directly
        responseSuccess = true;
        qrData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Unknown object format, try to extract array
        responseSuccess = true;
        qrData = Object.values(response.data).filter(item => 
          item && typeof item === 'object' && (item.qr_data || item.id)
        );
      }
      
      if (!responseSuccess) {
        throw new Error(response.data?.error || 'Failed to fetch QR history');
      }
      
      if (qrData.length > 0) {
        console.log('Found QR codes:', qrData.length);
        setQrCodes(qrData);
        
        // Set current index to the first active QR or the latest one
        const activeIndex = qrData.findIndex(qr => 
          qr.is_active && !qr.is_full && !qr.is_expired
        );
        setCurrentIndex(activeIndex >= 0 ? activeIndex : 0);
      } else {
        console.log('No QR codes found, but API call was successful');
        setQrCodes([]);
        setError('No QR codes found for this venue');
      }
    } catch (error) {
      console.error('QR History Error:', error.message);
      console.log('Error details:', error);
      setError(error.message || 'Failed to load QR history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToIndex = (index) => {
    if (index >= 0 && index < qrCodes.length) {
      setCurrentIndex(index);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>QR History</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2e86de" />
          <Text style={styles.loadingText}>Loading QR history...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>QR History</Text>
        </View>
        <View style={styles.centerContent}>
          <Icon name="error-outline" size={48} color="#ff4757" />
          <Text style={styles.error}>Error: {error}</Text>
          <TouchableOpacity onPress={fetchQRHistory} style={styles.retryButton}>
            <Icon name="refresh" size={20} color="#2e86de" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (qrCodes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>QR History</Text>
        </View>
        <View style={styles.centerContent}>
          <Icon name="qr-code-scanner" size={48} color="#a4b0be" />
          <Text style={styles.noDataText}>No QR codes found for this venue</Text>
          <TouchableOpacity onPress={fetchQRHistory} style={styles.retryButton}>
            <Icon name="refresh" size={20} color="#2e86de" />
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQR = qrCodes[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>QR History - {venue?.name || 'Unknown Venue'}</Text>
        <View style={styles.navigation}>
          <TouchableOpacity 
            onPress={() => navigateToIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
          >
            <Icon name="chevron-left" size={24} color={currentIndex === 0 ? "#ccc" : "#000"} />
          </TouchableOpacity>
          
          <Text style={styles.counter}>
            {currentIndex + 1} / {qrCodes.length}
          </Text>
          
          <TouchableOpacity 
            onPress={() => navigateToIndex(currentIndex + 1)}
            disabled={currentIndex === qrCodes.length - 1}
            style={[styles.navButton, currentIndex === qrCodes.length - 1 && styles.disabledButton]}
          >
            <Icon name="chevron-right" size={24} color={currentIndex === qrCodes.length - 1 ? "#ccc" : "#000"} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.qrContainer,
          {
            transform: [{ translateX: position }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <QRCode
          value={currentQR.qr_data || currentQR.qr_string || ''}
          size={250}
          color="black"
          backgroundColor="white"
        />
        
        <View style={styles.qrInfo}>
          <Text style={[
            styles.status,
            currentQR.is_full && styles.fullText,
            currentQR.is_expired && styles.expiredText,
            !currentQR.is_active && styles.inactiveText
          ]}>
            Status: {currentQR.is_active ? 
              (currentQR.is_full ? 'FULL' : 
               currentQR.is_expired ? 'EXPIRED' : 'ACTIVE') : 
              'INACTIVE'}
          </Text>
          
          <Text style={styles.capacity}>
            Usage: {currentQR.current_usage || 0}/{currentQR.max_capacity || 15}
          </Text>
          
          <Text style={styles.expiry}>
            Expires: {currentQR.expires_at ? new Date(currentQR.expires_at).toLocaleString() : 'Unknown'}
          </Text>
          
          <Text style={styles.created}>
            Created: {currentQR.created_at ? new Date(currentQR.created_at).toLocaleString() : 'Unknown'}
          </Text>
          
          {currentQR.qr_group_id && (
            <Text style={styles.groupId}>
              Group: {currentQR.qr_group_id}
            </Text>
          )}
        </View>
      </Animated.View>

      {qrCodes.length > 1 && (
        <View style={styles.dotsContainer}>
          {qrCodes.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => navigateToIndex(index)}
              style={[styles.dot, index === currentIndex && styles.activeDot]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  counter: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  qrInfo: {
    marginTop: 20,
    alignItems: 'center',
    gap: 5,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullText: {
    color: '#ff4757',
  },
  expiredText: {
    color: '#ff9f43',
  },
  inactiveText: {
    color: '#a4b0be',
  },
  capacity: {
    fontSize: 14,
  },
  expiry: {
    fontSize: 12,
    color: '#666',
  },
  created: {
    fontSize: 12,
    color: '#666',
  },
  groupId: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#2e86de',
  },
  error: {
    color: '#ff4757',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f2f6',
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#2e86de',
    fontSize: 16,
  },
});