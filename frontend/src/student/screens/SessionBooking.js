import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, TextInput, ImageBackground } from 'react-native';
import api from '../services/api';
import auth from '../services/auth'; 
import { globalStyles, colors, layout } from '../assets/globalStyles';
import { useNavigation } from '@react-navigation/native';
import FloatingActionButton from '../components/FloatingActionButton';
import HamburgerHeader from '../components/HamburgerHeader';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import StoryCircles from '../components/StoryCircles';

export default function SessionBooking() {
  const [venues, setVenues] = useState([]);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [cancelText, setCancelText] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [bookedVenues, setBookedVenues] = useState([]);
  const navigation = useNavigation();

  const getVenueBackgroundImage = (venueId) => {
    const backgroundImages = [
      { uri: 'https://plus.unsplash.com/premium_photo-1687919417608-09b4f68aafca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZGFyayUyMHZlbnVlcyUyMHdpdGglMjBuZW9uJTIwY29sb3Vyc3xlbnwwfHwwfHx8MA%3D%3D' },
      { uri: 'https://plus.unsplash.com/premium_photo-1687894509815-fcf10b8b4e6a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGRhcmslMjB2ZW51ZXMlMjB3aXRoJTIwbmVvbiUyMGNvbG91cnN8ZW58MHx8MHx8fDA%3D' },
      { uri: 'https://images.unsplash.com/photo-1699907236334-ee4cf86eba5c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
      { uri: 'https://images.unsplash.com/photo-1748280887521-6967d0f27450?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
      { uri: 'https://images.unsplash.com/photo-1693756948617-4f7bdd57bf54?q=80&w=1076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    ];

    let id;
    if (typeof venueId === 'string') {
      let hash = 0;
      for (let i = 0; i < venueId.length; i++) {
        hash = ((hash << 5) - hash) + venueId.charCodeAt(i);
        hash = hash & hash;
      }
      id = Math.abs(hash);
    } else {
      id = venueId || 0;
    }

    const imageIndex = id % backgroundImages.length;
    return backgroundImages[imageIndex];
  };

  const getVenueAccentColor = (venueId) => {
    const accentColors = [
      '#4F46E5', '#7C3AED', '#2563EB', '#059669', '#DC2626',
      '#EA580C', '#0891B2', '#9333EA', '#16A34A', '#C2410C',
    ];
    
    let id;
    if (typeof venueId === 'string') {
      let hash = 0;
      for (let i = 0; i < venueId.length; i++) {
        hash = ((hash << 5) - hash) + venueId.charCodeAt(i);
        hash = hash & hash;
      }
      id = Math.abs(hash);
    } else {
      id = venueId || 0;
    }
    
    const colorIndex = id % accentColors.length;
    return accentColors[colorIndex] || '#4F46E5';
  };

const fetchVenues = async (lvl) => {
  try {
    setLoading(true);
    setError(null);
    
    const authData = await auth.getAuthData();
    if (!authData.token) {
      throw new Error('Authentication required');
    }

    // Fetch venues for ALL levels (not just the current level)
    const allVenues = [];
    const bookedVenuesList = [];
    
    // Fetch venues for each level and combine them
    for (let currentLevel = 1; currentLevel <= 5; currentLevel++) {
      try {
        const response = await api.student.getSessions(currentLevel);
        
        if (response.data && response.data.length > 0) {
          // Process venues with proper expiry logic for each level
          const processedVenues = response.data.map(venue => {
            let isExpired = false;
            
            // Check if venue has an end time and if it's expired
            if (venue.end_time) {
              try {
                const endTime = new Date(venue.end_time);
                const now = new Date();
                
                // Handle timezone issues by comparing timestamps
                isExpired = endTime.getTime() <= now.getTime();
                
                console.log(`Venue ${venue.venue_name} (Level ${venue.level}): EndTime=${endTime.toISOString()}, Now=${now.toISOString()}, IsExpired=${isExpired}`);
              } catch (error) {
                console.error('Error parsing end time:', error);
                isExpired = false; // Default to not expired if parsing fails
              }
            }
            
            return {
              ...venue,
              is_expired: isExpired
            };
          });
          
          allVenues.push(...processedVenues);
          
          // Check booking status only for non-expired venues of current level
          for (const venue of processedVenues) {
            if (!venue.is_expired && venue.level === lvl) {
              try {
                const bookingResponse = await api.student.checkBooking(venue.id);
                if (bookingResponse.data && bookingResponse.data.is_booked) {
                  bookedVenuesList.push(venue.id);
                }
              } catch (error) {
                console.log('Booking check failed for venue:', venue.id);
              }
            }
          }
        }
      } catch (levelError) {
        console.log(`Error fetching level ${currentLevel} venues:`, levelError);
        // Continue with other levels if one fails
      }
    }
    
    if (allVenues.length === 0) {
      setError(`No venues found for any level.`);
      setVenues([]);
      setBookedVenues([]);
    } else {
      // Filter venues to show only the selected level, but include expired ones
      const filteredVenues = allVenues.filter(venue => venue.level === lvl);
      
      setVenues(filteredVenues);
      setBookedVenues(bookedVenuesList);
      
      console.log(`Displaying ${filteredVenues.length} venues for level ${lvl} (${filteredVenues.filter(v => v.is_expired).length} expired)`);
    }
  } catch (error) {
    console.error('Venues fetch error:', error);
    setError(error.response?.data?.error || error.message || 'Failed to load venues');
    setVenues([]);
    setBookedVenues([]);
  } finally {
    setLoading(false);
  }
};

  const openVenueDetails = (venue) => {
    setSelectedVenue(venue);
    
    // Only check booking status for non-expired venues
    if (!venue.is_expired) {
      checkIfBooked(venue.id);
    } else {
      setIsBooked(false); // Expired venues can't be booked
    }
    
    setIsModalVisible(true);
  };

  const checkIfBooked = async (venueId) => {
    try {
      const authData = await auth.getAuthData();
      const response = await api.student.checkBooking(venueId);
      setIsBooked(response.data.is_booked);
    } catch (error) {
      console.error('Check booking error:', error);
      setIsBooked(false);
    }
  };

const handleBookVenue = async () => {
  // Prevent booking expired venues
  if (selectedVenue.is_expired) {
    Alert.alert('Booking Failed', 'This session has expired and cannot be booked');
    return;
  }

  try {
    setLoading(true);
    const authData = await auth.getAuthData();
    const studentLevel = parseInt(authData.level || 1);
    
    if (studentLevel !== selectedVenue.level) {
      Alert.alert(
        'Booking Failed',
        `You can only book venues for your current level (Level ${studentLevel})`
      );
      return;
    }
    
    // Check if student already has an active booking at this level
    try {
      const existingBookingsResponse = await api.student.getUserBookings();
      const activeBookings = existingBookingsResponse.data || [];
      
      // Check if there's any active booking at the same level
      const hasActiveBookingAtLevel = activeBookings.some(booking => {
        return booking.level === selectedVenue.level && 
               booking.status !== 'completed' && 
               booking.status !== 'cancelled';
      });
      
      if (hasActiveBookingAtLevel) {
        Alert.alert(
          'Booking Failed',
          `You already have an active booking for Level ${selectedVenue.level}. Complete or cancel it before booking another venue at this level.`
        );
        return;
      }
    } catch (bookingCheckError) {
      console.log('Could not check existing bookings, proceeding with booking attempt');
      // Continue with booking if we can't check existing bookings
    }
    
    const response = await api.student.bookVenue(selectedVenue.id);
    
    setBookedVenues([...bookedVenues, selectedVenue.id]);
    Alert.alert(
      'Booking Successful',
      `You have successfully booked ${selectedVenue.venue_name}`,
      [{ text: 'OK', onPress: () => {
        fetchVenues(level);
        setIsModalVisible(false);
      }}]
    );
  } catch (error) {
    let errorMessage = 'Failed to book venue';
    if (error.response?.status === 409) {
      errorMessage = 'You have already booked this venue';
    } else if (error.response?.status === 403) {
      errorMessage = 'You can only have one active booking at a time for this level';
    } else if (error.response?.status === 410) {
      errorMessage = 'This session has expired and cannot be booked';
    }
    Alert.alert('Booking Failed', errorMessage);
  } finally {
    setLoading(false);
  }
};

  const handleCancelBooking = async () => {
    if (cancelText.toLowerCase() !== 'cancel') {
      Alert.alert('Invalid Input', 'Please type "cancel" to confirm');
      return;
    }

    try {
      setLoading(true);
      const response = await api.student.cancelBooking(selectedVenue.id);
      
      setBookedVenues(bookedVenues.filter(id => id !== selectedVenue.id));
      Alert.alert(
        'Booking Cancelled',
        `Your booking for ${selectedVenue.venue_name} has been cancelled`,
        [{ text: 'OK', onPress: () => {
          fetchVenues(level);
          setIsModalVisible(false);
          setCancelText('');
        }}]
      );
    } catch (error) {
      Alert.alert('Cancellation Failed', 'Failed to cancel booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues(level);
  }, [level]);

  const handleLevelChange = (lvl) => {
    setLevel(lvl);
  };

  const getAvailabilityColor = (remaining, capacity) => {
    const percentage = (remaining / capacity) * 100;
    if (percentage > 50) return '#10B981';
    if (percentage > 20) return '#F59E0B';
    return '#EF4444';
  };

  const renderVenueItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.venueCard, 
        { 
          borderLeftColor: getVenueAccentColor(item.id),
          opacity: item.is_expired ? 0.7 : 1
        }
      ]}
      onPress={() => openVenueDetails(item)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <ImageBackground
        source={getVenueBackgroundImage(item.id)}
        style={styles.venueCardGradient}
        imageStyle={styles.venueCardBackgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.venueCardOverlay}
        >
          {/* Expired Session Banner */}
          {item.is_expired && (
            <View style={styles.expiredBanner}>
              <Icon name="schedule" size={14} color="#fff" />
              <Text style={styles.expiredBannerText}>Session Expired</Text>
            </View>
          )}
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.venueNameContainer}>
                <View style={[styles.venueIconContainer, { 
                  backgroundColor: item.is_expired ? '#6B7280' : getVenueAccentColor(item.id) + '40' 
                }]}>
                  <Icon 
                    name="place" 
                    size={18} 
                    color={item.is_expired ? '#9CA3AF' : getVenueAccentColor(item.id)} 
                  />
                </View>
                <Text style={[
                  styles.venueName,
                  item.is_expired && styles.expiredText
                ]}>
                  {item.venue_name}
                </Text>
              </View>
              {bookedVenues.includes(item.id) && !item.is_expired && (
                <View style={styles.bookedBadge}>
                  <Icon name="check-circle" size={14} color="#10B981" />
                  <Text style={styles.bookedBadgeText}>Booked</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="schedule" size={16} color={item.is_expired ? "#6B7280" : "#CBD5E1"} />
                  <Text style={[
                    styles.infoLabel,
                    item.is_expired && styles.expiredText
                  ]}>Timing</Text>
                  <Text style={[
                    styles.infoValue,
                    item.is_expired && styles.expiredText
                  ]}>{item.session_timing || 'Not specified'}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Icon name="group" size={16} color={item.is_expired ? "#6B7280" : "#CBD5E1"} />
                  <Text style={[
                    styles.infoLabel,
                    item.is_expired && styles.expiredText
                  ]}>Capacity</Text>
                  <Text style={[
                    styles.infoValue,
                    item.is_expired && styles.expiredText
                  ]}>{item.capacity}</Text>
                </View>
              </View>

              {!item.is_expired && (
                <View style={styles.availabilitySection}>
                  <View style={styles.availabilityHeader}>
                    <Text style={styles.availabilityLabel}>Available Spots</Text>
                    <Text style={[styles.availabilityNumber, { 
                      color: getAvailabilityColor(item.remaining, item.capacity) 
                    }]}>
                      {item.remaining}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${(item.remaining / item.capacity) * 100}%`,
                            backgroundColor: getAvailabilityColor(item.remaining, item.capacity)
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round((item.remaining / item.capacity) * 100)}%
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.statusIndicator}>
                <View style={[
                  styles.statusDot, 
                  { 
                    backgroundColor: item.is_expired ? '#6B7280' : 
                      (item.remaining > 0 ? '#10B981' : '#EF4444') 
                  }
                ]} />
                <Text style={[
                  styles.statusText,
                  item.is_expired && styles.expiredText
                ]}>
                  {item.is_expired ? 'Expired' : (item.remaining > 0 ? 'Available' : 'Full')}
                </Text>
              </View>
              <Icon name="keyboard-arrow-right" size={20} color="#CBD5E1" />
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Booking</Text>
          <Text style={styles.subtitle}>Find and book your discussion sessions</Text>
        </View>
        <StoryCircles/>

        <View style={styles.levelSelector}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.levelScrollContent}
          >
            {[1, 2, 3, 4, 5].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelButton,
                  level === lvl && styles.levelButtonActive
                ]}
                onPress={() => handleLevelChange(lvl)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.levelButtonText,
                  level === lvl && styles.levelButtonTextActive
                ]}>
                  Level {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading venues...</Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Icon name="error-outline" size={48} color="#6B7280" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchVenues(level)}
              >
                <Icon name="refresh" size={18} color="#4F46E5" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <Icon name="event-busy" size={64} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Sessions Available</Text>
              <Text style={styles.emptySubtitle}>Check back later for Level {level} sessions</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={venues}
            keyExtractor={item => item.id}
            renderItem={renderVenueItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <FloatingActionButton 
          onPress={() => navigation.navigate('QrScanner')}
          iconName="qr-code-scanner"
        />
      </View>

      {/* Modal with dark theme */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedVenue && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderContent}>
                    <View style={[styles.modalIconContainer, { backgroundColor: getVenueAccentColor(selectedVenue.id) + '20' }]}>
                      <Icon name="place" size={24} color={getVenueAccentColor(selectedVenue.id)} />
                    </View>
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalTitle}>{selectedVenue.venue_name}</Text>
                      <Text style={styles.modalSubtitle}>Session Details</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setIsModalVisible(false);
                      setCancelText('');
                    }}
                  >
                    <Icon name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.modalInfoGrid}>
                    <View style={styles.modalInfoItem}>
                      <Icon name="schedule" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Timing</Text>
                      <Text style={styles.modalInfoValue}>{selectedVenue.session_timing}</Text>
                    </View>
                    
                    <View style={styles.modalInfoItem}>
                      <Icon name="table-restaurant" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Table</Text>
                      <Text style={styles.modalInfoValue}>{selectedVenue.table_details}</Text>
                    </View>
                    
                    <View style={styles.modalInfoItem}>
                      <Icon name="group" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Capacity</Text>
                      <Text style={styles.modalInfoValue}>{selectedVenue.capacity}</Text>
                    </View>
                    
                    <View style={styles.modalInfoItem}>
                      <Icon name="event-available" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Available</Text>
                      <Text style={[styles.modalInfoValue, { color: getAvailabilityColor(selectedVenue.remaining, selectedVenue.capacity) }]}>
                        {selectedVenue.remaining}
                      </Text>
                    </View>
                  </View>
                  
                  {selectedVenue.is_expired && (
                    <View style={styles.expiredSessionBanner}>
                      <Icon name="error-outline" size={20} color="#DC2626" />
                      <Text style={styles.expiredSessionText}>
                        This session has expired and cannot be booked
                      </Text>
                    </View>
                  )}
                  
                  {!selectedVenue.is_expired && isBooked ? (
                    <View style={styles.modalBookedSection}>
                      <View style={styles.modalBookedStatus}>
                        <Icon name="check-circle" size={20} color="#10B981" />
                        <Text style={styles.modalBookedStatusText}>You have booked this session</Text>
                      </View>
                      
                      <TextInput
                        style={styles.modalCancelInput}
                        placeholder="Type 'cancel' to confirm cancellation"
                        placeholderTextColor="#6B7280"
                        value={cancelText}
                        onChangeText={setCancelText}
                      />
                      
                      <TouchableOpacity
                        style={[
                          styles.modalActionButton,
                          styles.modalCancelButton,
                          cancelText.toLowerCase() !== 'cancel' && styles.modalActionButtonDisabled
                        ]}
                        onPress={() => {
                          if (cancelText.toLowerCase() === 'cancel') {
                            Alert.alert(
                              'Confirm Cancellation',
                              'Are you sure you want to cancel this booking?',
                              [
                                { text: 'No', style: 'cancel' },
                                { text: 'Yes', onPress: handleCancelBooking }
                              ]
                            );
                          }
                        }}
                        disabled={loading || cancelText.toLowerCase() !== 'cancel'}
                      >
                        <Icon name="cancel" size={18} color="#fff" />
                        <Text style={styles.modalActionButtonText}>Cancel Booking</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
 <TouchableOpacity
    style={[
      styles.modalActionButton,
      styles.modalBookButton,
      (selectedVenue.remaining <= 0 || selectedVenue.is_expired || isBooked) && 
      styles.modalActionButtonDisabled
    ]}
    onPress={handleBookVenue}
    disabled={loading || selectedVenue.remaining <= 0 || selectedVenue.is_expired || isBooked}
  >
    <Icon 
      name={
        selectedVenue.is_expired ? "block" : 
        selectedVenue.remaining <= 0 ? "block" : 
        isBooked ? "check-circle" : "event-available"
      } 
      size={18} 
      color="#fff" 
    />
    <Text style={styles.modalActionButtonText}>
      {selectedVenue.is_expired ? 'Session Expired' : 
       selectedVenue.remaining <= 0 ? 'Fully Booked' : 
       isBooked ? 'Already Booked' : 'Book Session'}
    </Text>
  </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1bff',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '400',
  },
  levelSelector: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#4F46E5',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  levelButtonTextActive: {
    color: '#FFFFFF',
  },
  venueCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  venueCardGradient: {
    flex: 1,
    position: 'relative',
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  diagonalLine: {
    position: 'absolute',
    width: 4,
    height: '200%',
    transform: [{ rotate: '45deg' }],
  },
  horizontalLine: {
    position: 'absolute',
    width: '100%',
    height: 4,
  },
  verticalLine: {
    position: 'absolute',
    width: 4,
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  venueNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  venueIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  bookedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '600',
    textAlign: 'center',
  },
  availabilitySection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  availabilityNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
    marginLeft: 12,
    minWidth: 35,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  modalContent: {
    padding: 20,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  modalInfoItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInfoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBookedSection: {
    marginTop: 4,
  },
  modalBookedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modalBookedStatusText: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalCancelInput: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#F8FAFC',
    backgroundColor: '#0a0f1bff',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalBookButton: {
    backgroundColor: '#4F46E5',
  },
  modalCancelButton: {
    backgroundColor: '#DC2626',
  },
  modalActionButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  venueCardBackgroundImage: {
  borderRadius: 16,
},
venueCardOverlay: {
  flex: 1,
  borderRadius: 16,
},
levelScrollContent: {
  flexDirection: 'row',
  paddingHorizontal: 4,
},

expiredSessionBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FEF2F2',
  padding: 12,
  borderRadius: 8,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#FECACA',
},
expiredSessionText: {
  color: '#DC2626',
  marginLeft: 8,
  fontWeight: '500',
},
expiredBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(220, 38, 38, 0.2)',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  marginBottom: 12,
  alignSelf: 'flex-start',
},
expiredBannerText: {
  color: '#FCA5A5',
  fontSize: 12,
  fontWeight: '600',
  marginLeft: 4,
},
expiredText: {
  color: '#9CA3AF',
},
});