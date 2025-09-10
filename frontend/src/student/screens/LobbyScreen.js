import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList,
  TouchableOpacity,
  Image,
  AppState
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import HamburgerHeader from '../components/HamburgerHeader';
import auth from '../services/auth';
export default function LobbyScreen({ navigation, route }) {
    const { sessionId } = route.params;
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
    const [timerActive, setTimerActive] = useState(false); // Changed to false initially
    const [backgroundTime, setBackgroundTime] = useState(null);
    const [appState, setAppState] = useState(AppState.currentState);
    const [readyStatuses, setReadyStatuses] = useState([]);
    const [allReady, setAllReady] = useState(false);
    // Track app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
                // App came to foreground, recalculate time
                if (backgroundTime && timerActive) {
                    const elapsedSeconds = Math.floor((Date.now() - backgroundTime) / 1000);
                    setTimeRemaining(prev => Math.max(0, prev - elapsedSeconds));
                }
            } else if (nextAppState.match(/inactive|background/)) {
                // App going to background, store current time
                setBackgroundTime(Date.now());
            }
            setAppState(nextAppState);
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        return () => {
            subscription.remove();
        };
    }, [appState, backgroundTime, timerActive]); // Added timerActive dependency

    // Timer effect - only runs when timerActive is true
    useEffect(() => {
        let timerInterval;
        
        if (timerActive && timeRemaining > 0) {
            timerInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerInterval);
                        setTimerActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [timerActive]);
useEffect(() => {
  const fetchReadyStatus = async () => {
    try {
      // Try to get ready status from backend
      const response = await api.student.getReadyStatus(sessionId);
      setReadyStatuses(response.data.ready_statuses || []);
      
      // Try to check if all are ready
      const allReadyResponse = await api.student.checkAllReady(sessionId);
      setAllReady(allReadyResponse.data.all_ready || false);
      
      // If all participants are ready, navigate to session
      if (allReadyResponse.data.all_ready) {
        navigation.replace('GdSession', { sessionId });
      }
    } catch (error) {
      console.error('Error fetching ready status:', error);
      // Fallback: Use local state to track ready status
      // This will work until backend routes are implemented
      setReadyStatuses([]);
      setAllReady(false);
    }
  };
  
  // Initial fetch
  fetchReadyStatus();
  
  // Poll every 3 seconds
  const readyInterval = setInterval(fetchReadyStatus, 3000);
  
  return () => {
    clearInterval(readyInterval);
  };
}, [sessionId]);

    const fetchParticipants = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await api.get('/student/session/participants', { 
                params: { session_id: sessionId },
                headers: {
                    Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
                },
                validateStatus: function (status) {
                    return status === 200 || status === 404;
                }
            });
            
            if (response.status === 404) {
                setParticipants([]);
            } else {
                setParticipants(response.data?.data || []);
            }
        } catch (error) {
            console.error('Error fetching participants:', error);
            setParticipants([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchParticipants();

        // Poll every 5 seconds
        const interval = setInterval(fetchParticipants, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [sessionId]);

const handleReady = async () => {
  try {
    setIsReady(true);
    
    // Update ready status in backend
    await api.student.updateReadyStatus(sessionId, true);
    
    // Start the timer when user clicks "I'm Ready"
    setTimerActive(true);

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    await api.put('/student/session/status', { 
      sessionId, 
      status: 'active'
    }, {
      headers: {
        Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
      }
    });
    
  } catch (error) {
    console.error('Error starting session:', error);
    setIsReady(false);
    setTimerActive(false);
  }
};

const getReadyStatusForParticipant = (participantId) => {
  const status = readyStatuses.find(s => s.student_id === participantId);
  return status ? status.is_ready : false;
};

// Navigate when timer completes
    useEffect(() => {
        if (timeRemaining === 0 && isReady) {
            navigation.replace('GdSession', { sessionId });
        }
    }, [timeRemaining, isReady, navigation, sessionId]);

    // Format time for display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Check if timer is completed and ready button should be enabled
    const isReadyButtonEnabled = !isReady; // Button is enabled initially, disabled after clicking

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingTitle}>Joining Session</Text>
                        <Text style={styles.loadingSubtitle}>Please wait while we set up your lobby...</Text>
                    </View>
                </View>
            </View>
        );
    }

  const renderParticipantItem = ({ item, index }) => {
  const isReady = getReadyStatusForParticipant(item.id);
  
  return (
    <View style={styles.participantCard}>
      <View style={styles.participantHeader}>
        <View style={styles.participantAvatar}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.avatarImage}
              onError={(e) => {
                console.log('Image load error:', e.nativeEvent.error);
              }}
            />
          ) : (
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              style={styles.avatarGradient}
            >
              <Icon name="person" size={20} color="#fff" />
            </LinearGradient>
          )}
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{item.name}</Text>
          {item.department && (
            <Text style={styles.participantDept}>{item.department}</Text>
          )}
        </View>
        <View style={styles.readyStatusContainer}>
          {isReady ? (
            <View style={styles.readyIndicator}>
              <Icon name="check-circle" size={16} color="#10B981" />
              <Text style={styles.readyText}>Ready</Text>
            </View>
          ) : (
            <View style={styles.notReadyIndicator}>
              <Icon name="schedule" size={16} color="#94A3B8" />
              <Text style={styles.notReadyText}>Waiting</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

    return (
        <View style={styles.container}>
            <HamburgerHeader title='Lobby'/>
            <View style={styles.contentContainer}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.title}>Session Lobby</Text>
                    <Text style={styles.subtitle}>Waiting for participants to join...</Text>
                </View>

                {/* Timer Section - Only show when timer is active */}
               

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Icon name="group" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.statNumber}>{participants.length}</Text>
                            <Text style={styles.statLabel}>Participants</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Icon name="schedule" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.statNumber}>5s</Text>
                            <Text style={styles.statLabel}>Auto Refresh</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Icon name="wifi" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.statNumber}>Live</Text>
                            <Text style={styles.statLabel}>Status</Text>
                        </View>
                    </View>
                </View>
                
                {/* Participants Section */}
                <View style={styles.participantsContainer}>
                    <View style={styles.participantsHeader}>
                        <Text style={styles.participantsTitle}>
                            Participants ({participants.length})
                        </Text>
                        <View style={styles.refreshIndicator}>
                            <Icon name="sync" size={16} color="#94A3B8" />
                        </View>
                    </View>
                    
                    <View style={styles.participantsList}>
                        {participants.length > 0 ? (
                            <FlatList
                                data={participants}
                                keyExtractor={item => item.id}
                                renderItem={renderParticipantItem}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.listContent}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Icon name="person-add" size={48} color="#6B7280" />
                                </View>
                                <Text style={styles.emptyTitle}>Waiting for Others</Text>
                                <Text style={styles.emptyText}>
                                    Other participants will appear here when they join the session
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Ready Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.readyButton,
                            (!isReadyButtonEnabled || isReady) && styles.readyButtonDisabled
                        ]}
                        onPress={handleReady}
                        disabled={!isReadyButtonEnabled || isReady}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={(!isReadyButtonEnabled || isReady) ? ['#6B7280', '#4B5563'] : ['#10B981', '#059669']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.readyButtonGradient}
                        >
                            <View style={styles.readyButtonContent}>
                                {isReady ? (
                                    <>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.readyButtonText}>
                                            {timerActive ? formatTime(timeRemaining) : 'Starting Session...'}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="play-arrow" size={24} color="#fff" />
                                        <Text style={styles.readyButtonText}>I'm Ready</Text>
                                    </>
                                )}
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    <Text style={styles.readyHint}>
                        {isReady ? (timerActive ? `Session begins in ${formatTime(timeRemaining)}` : 'Launching your session...') : 'Tap when you\'re ready to begin'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030508ff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingCard: {
        backgroundColor: '#090d13ff',
        borderRadius: 20,
        paddingVertical: 40,
        paddingHorizontal: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F8FAFC',
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 25,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F8FAFC',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        fontWeight: '500',
    },
    statsContainer: {
        backgroundColor: '#090d13ff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconContainer: {
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#334155',
        marginHorizontal: 16,
    },
    participantsContainer: {
        flex: 1,
        marginBottom: 20,
    },
    participantsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    participantsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    refreshIndicator: {
        padding: 6,
    },
    participantsList: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 10,
    },
    participantCard: {
        backgroundColor: '#090d13ff',
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    participantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    participantAvatar: {
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: 12,
    },
    avatarGradient: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 2,
    },
    participantDept: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '400',
    },
    onlineIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    onlineText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#090d13ff',
        borderRadius: 16,
        paddingVertical: 40,
        paddingHorizontal: 32,
        borderWidth: 1,
        borderColor: '#334155',
    },
    emptyIconContainer: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomContainer: {
        alignItems: 'center',
    },
    readyButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    readyButtonDisabled: {
        opacity: 0.7,
    },
    readyButtonGradient: {
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    readyButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    readyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    readyHint: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        fontStyle: 'italic',
    },
   timerContainer: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
    },
    timerGradient: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginVertical: 8,
    },
    timerLabel: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
    timerSyncInfo: {
        fontSize: 10,
        color: '#fff',
        opacity: 0.7,
        marginTop: 5,
    },
     readyStatusContainer: {
    marginLeft: 'auto',
    alignItems: 'center',
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notReadyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readyText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 4,
  },
  notReadyText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
});


