import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import api from '../services/api';
import auth from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Timer from '../components/Timer';
import { globalStyles, colors, layout } from '../assets/globalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HamburgerHeader from '../components/HamburgerHeader';
import LinearGradient from 'react-native-linear-gradient';

export default function GdSessionScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('prep');
  const [timerActive, setTimerActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [topic, setTopic] = useState("");
  const [isNewSession, setIsNewSession] = useState(true);

useEffect(() => {
    // Reset phase to 'prep' when sessionId changes (new session)
    if (sessionId) {
      setPhase('prep');
      setIsNewSession(true);
      // Clear any stored session state for this session
      AsyncStorage.removeItem(`session_${sessionId}`);
    }
  }, [sessionId]);

  useEffect(() => {
    const syncPhaseWithServer = async () => {
      try {
        const response = await api.student.getSessionPhase(sessionId);
        if (response.data.phase !== phase) {
          setPhase(response.data.phase);
          const remainingSeconds = Math.max(0, 
            (new Date(response.data.end_time) - new Date()) / 1000
          );
          setTimeRemaining(remainingSeconds);
        }
      } catch (error) {
        console.log("Using local phase state as fallback");
        // Force prep phase for new sessions
        if (isNewSession) {
          setPhase('prep');
          setIsNewSession(false);
        }
      }
    };
    
    if (sessionId) {
      syncPhaseWithServer();
    }
  }, [sessionId, isNewSession]);

  // Load session state from storage on mount
 useEffect(() => {
    const loadSessionState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(`session_${sessionId}`);
        if (savedState) {
          const { phase: savedPhase, timeRemaining: savedTime } = JSON.parse(savedState);
          // Only use saved state if it's not a new session
          if (!isNewSession) {
            setPhase(savedPhase);
            setTimeRemaining(savedTime);
          }
        }
      } catch (error) {
        console.log('Error loading session state:', error);
      }
    };

    if (sessionId && !isNewSession) {
      loadSessionState();
    }
  }, [sessionId, isNewSession]);

  // Save session state to storage whenever it changes
  useEffect(() => {
    const saveSessionState = async () => {
      try {
        await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify({
          phase,
          timeRemaining
        }));
      } catch (error) {
        console.log('Error saving session state:', error);
      }
    };

    if (sessionId) {
      saveSessionState();
    }
  }, [phase, timeRemaining, sessionId]);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Session in Progress",
        "Are you sure you want to leave? The timer will continue running.",
        [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel"
          },
          { 
            text: "Leave", 
            onPress: () => navigation.goBack() 
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Fetch session details and topic
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSessionAndTopic = async () => {
      try {
        const authData = await auth.getAuthData();
        
        if (!authData?.token) {
          throw new Error('Authentication required');
        }

        // Fetch session details
        const response = await api.student.getSession(sessionId);
        
        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        if (!response.data || !response.data.id) {
          throw new Error('Invalid session data received');
        }

        const sessionData = response.data;
        setSession(sessionData);

        // Fetch topic for the session's level - FIXED THIS PART
        try {
          const topicResponse = await api.student.getTopicForLevel(sessionData.level);
          
          // Check if the response structure is correct
          if (topicResponse.data && topicResponse.data.topic_text) {
            setTopic(topicResponse.data.topic_text);
          } else if (topicResponse.data && typeof topicResponse.data === 'string') {
            // Handle case where the response might be just the topic text
            setTopic(topicResponse.data);
          } else {
            // Use default topic if none found
            setTopic("Discuss the impact of technology on modern education");
          }
        } catch (topicError) {
          console.log('Failed to fetch session topic:', topicError);
          setTopic("Discuss the impact of technology on modern education");
        }

      } catch (error) {
        console.error('Failed to load session:', error);
        let errorMessage = error.message;
        
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = 'Session not found';
          } else if (error.response.status === 403) {
            errorMessage = 'Not authorized to view this session';
          } else if (error.response.status === 500) {
            errorMessage = 'Server error - please try again later';
          }
        }
        
        Alert.alert(
          'Session Error',
          errorMessage,
          [{ 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndTopic();
  }, [sessionId, navigation]);

  const handlePhaseComplete = () => {
    if (phase === 'prep') {
      setPhase('discussion');
      setTimeRemaining(session.discussion_time * 60);
    } else if (phase === 'discussion') {
      
      navigation.navigate('Survey', { 
        sessionId: sessionId,
        members: [] 
      });
    }
  };

  const getPhaseIcon = (currentPhase) => {
    switch (currentPhase) {
      case 'prep': return 'psychology';
      case 'discussion': return 'forum';
      case 'survey': return 'quiz';
      default: return 'schedule';
    }
  };

  const getPhaseColors = (currentPhase) => {
    switch (currentPhase) {
      case 'prep': return ['#FF9800', '#F57C00'];
      case 'discussion': return ['#4CAF50', '#388E3C'];
      default: return ['#9E9E9E', '#757575'];
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconContainer}>
              <Icon name="hourglass-empty" size={48} color="#4F46E5" />
            </View>
            <Text style={styles.loadingTitle}>Loading Session</Text>
            <Text style={styles.loadingSubtitle}>Preparing your discussion environment...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!sessionId || !session) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
              <Icon name="error-outline" size={64} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Session Not Found</Text>
            <Text style={styles.errorSubtitle}>Unable to load session details</Text>
            <TouchableOpacity 
              style={styles.backButtonContainer}
              onPress={() => navigation.goBack()}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.backButtonGradient}
              >
                <Icon name="arrow-back" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Group Discussion</Text>
          <Text style={styles.headerSubtitle}>Session in Progress</Text>
        </View>

        {/* Topic Card */}
        <View style={styles.topicCard}>
          <View style={styles.topicHeader}>
            <View style={styles.topicIconContainer}>
              <Icon name="lightbulb-outline" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.topicLabel}>Discussion Topic</Text>
          </View>
          <Text style={styles.topic}>{topic}</Text>
        </View>

        {/* Timer Section */}
        <View style={styles.timerSection}>
          <View style={styles.timerContainer}>
            <View style={styles.timerHeader}>
              <Icon name="timer" size={32} color="#F8FAFC" />
              <Text style={styles.timerTitle}>Time Remaining</Text>
            </View>
            <View style={styles.timerWrapper}>
               <Timer 
    duration={
      phase === 'prep' ? session.prep_time * 60 : 
      phase === 'discussion' ? session.discussion_time * 60 : 
      1 
    }
    onComplete={handlePhaseComplete}
    active={timerActive}
    initialTimeRemaining={timeRemaining}
    onTick={(remaining) => setTimeRemaining(remaining)}
    textStyle={{ fontSize: 48, fontWeight: '800', color: '#FFFFFF' }}
  />
            </View>
          </View>
        </View>

        {/* Phase Progress Indicators */}
       <View style={styles.progressContainer}>
  <View style={styles.progressSteps}>
    {['prep', 'discussion'].map((stepPhase, index) => ( 
      <View key={stepPhase} style={styles.stepContainer}>
        <View style={[
          styles.stepCircle,
          phase === stepPhase && styles.stepCircleActive,
          index < ['prep', 'discussion'].indexOf(phase) && styles.stepCircleCompleted
        ]}>
          <LinearGradient
            colors={phase === stepPhase || index < ['prep', 'discussion'].indexOf(phase) 
              ? getPhaseColors(stepPhase) 
              : ['#374151', '#4B5563']}
            style={styles.stepGradient}
          >
            <Icon 
              name={getPhaseIcon(stepPhase)} 
              size={26} 
              color={phase === stepPhase || index < ['prep', 'discussion'].indexOf(phase) ? '#fff' : '#9CA3AF'} 
            />
          </LinearGradient>
        </View>
        <Text style={[
          styles.stepLabel,
          phase === stepPhase && styles.stepLabelActive
        ]}>
          {stepPhase === 'prep' ? 'Prep' : 'Discuss'}
        </Text>
        {index < 1 && <View style={styles.stepConnector} />} 
      </View>
    ))}
  </View>
</View>

        {/* Action Hints */}
        <View style={styles.hintsContainer}>
          <Icon name="info-outline" size={20} color="#4F46E5" />
          <Text style={styles.hintsText}>
            {phase === 'prep' ? 'Use this time to think about the topic and organize your thoughts' :
             phase === 'discussion' ? 'Actively participate in the group discussion' :'Preparing survey...'}
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
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 25,
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
  loadingIconContainer: {
    marginBottom: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  topicCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topicIconContainer: {
    marginRight: 12,
  },
  topicLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  topic: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
  },
  timerSection: {
    marginBottom: 24,
  },
  timerContainer: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 12,
  },
  timerWrapper: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  progressContainer: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stepGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    padding: 7,
  },
  stepLabelActive: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  stepConnector: {
    position: 'absolute',
    top: 20,
    left: 40,
    width: 40,
    height: 2,
    backgroundColor: '#334155',
  },
  hintsContainer: {
    backgroundColor: '#090d13ff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hintsText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 12,
    lineHeight: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#F8FAFC',
  },
});


// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
// import api from '../services/api';
// import auth from '../services/auth';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Timer from '../components/Timer';
// import { globalStyles, colors, layout } from '../assets/globalStyles';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import HamburgerHeader from '../components/HamburgerHeader';
// import LinearGradient from 'react-native-linear-gradient';

// export default function GdSessionScreen({ navigation, route }) {
//   const { sessionId } = route.params || {};
//   const [session, setSession] = useState(null);
//   const [phase, setPhase] = useState('prep');
//   const [timerActive, setTimerActive] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [timeRemaining, setTimeRemaining] = useState(0);
//   const [topic, setTopic] = useState("");

//   useEffect(() => {
//     const syncPhaseWithServer = async () => {
//       try {
//         const response = await api.student.getSessionPhase(sessionId);
//         if (response.data.phase !== phase) {
//           setPhase(response.data.phase);
//           const remainingSeconds = Math.max(0, 
//             (new Date(response.data.end_time) - new Date()) / 1000
//           );
//           setTimeRemaining(remainingSeconds);
//         }
//       } catch (error) {
//         console.log("Using local phase state as fallback");
//       }
//     };
    
//     syncPhaseWithServer();
//   }, [sessionId]);

//   // Load session state from storage on mount
//   useEffect(() => {
//     const loadSessionState = async () => {
//       try {
//         const savedState = await AsyncStorage.getItem(`session_${sessionId}`);
//         if (savedState) {
//           const { phase: savedPhase, timeRemaining: savedTime } = JSON.parse(savedState);
//           setPhase(savedPhase);
//           setTimeRemaining(savedTime);
//         }
//       } catch (error) {
//         console.log('Error loading session state:', error);
//       }
//     };

//     if (sessionId) {
//       loadSessionState();
//     }
//   }, [sessionId]);

//   // Save session state to storage whenever it changes
//   useEffect(() => {
//     const saveSessionState = async () => {
//       try {
//         await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify({
//           phase,
//           timeRemaining
//         }));
//       } catch (error) {
//         console.log('Error saving session state:', error);
//       }
//     };

//     if (sessionId) {
//       saveSessionState();
//     }
//   }, [phase, timeRemaining, sessionId]);

//   // Handle back button press
//   useEffect(() => {
//     const backAction = () => {
//       Alert.alert(
//         "Session in Progress",
//         "Are you sure you want to leave? The timer will continue running.",
//         [
//           {
//             text: "Cancel",
//             onPress: () => null,
//             style: "cancel"
//           },
//           { 
//             text: "Leave", 
//             onPress: () => navigation.goBack() 
//           }
//         ]
//       );
//       return true;
//     };

//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       backAction
//     );

//     return () => backHandler.remove();
//   }, [navigation]);

//   // Fetch session details and topic
//   useEffect(() => {
//     if (!sessionId) {
//       setLoading(false);
//       return;
//     }

//     const fetchSessionAndTopic = async () => {
//       try {
//         const authData = await auth.getAuthData();
        
//         if (!authData?.token) {
//           throw new Error('Authentication required');
//         }

//         // Fetch session details
//         const response = await api.student.getSession(sessionId);
        
//         if (response.data?.error) {
//           throw new Error(response.data.error);
//         }

//         if (!response.data || !response.data.id) {
//           throw new Error('Invalid session data received');
//         }

//         const sessionData = response.data;
//         setSession(sessionData);

//         // Fetch topic for the session's level - FIXED THIS PART
//         try {
//           const topicResponse = await api.student.getTopicForLevel(sessionData.level);
          
//           // Check if the response structure is correct
//           if (topicResponse.data && topicResponse.data.topic_text) {
//             setTopic(topicResponse.data.topic_text);
//           } else if (topicResponse.data && typeof topicResponse.data === 'string') {
//             // Handle case where the response might be just the topic text
//             setTopic(topicResponse.data);
//           } else {
//             // Use default topic if none found
//             setTopic("Discuss the impact of technology on modern education");
//           }
//         } catch (topicError) {
//           console.log('Failed to fetch session topic:', topicError);
//           setTopic("Discuss the impact of technology on modern education");
//         }

//       } catch (error) {
//         console.error('Failed to load session:', error);
//         let errorMessage = error.message;
        
//         if (error.response) {
//           if (error.response.status === 404) {
//             errorMessage = 'Session not found';
//           } else if (error.response.status === 403) {
//             errorMessage = 'Not authorized to view this session';
//           } else if (error.response.status === 500) {
//             errorMessage = 'Server error - please try again later';
//           }
//         }
        
//         Alert.alert(
//           'Session Error',
//           errorMessage,
//           [{ 
//             text: 'OK', 
//             onPress: () => navigation.goBack()
//           }]
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSessionAndTopic();
//   }, [sessionId, navigation]);

//   const handlePhaseComplete = () => {
//     if (phase === 'prep') {
//       setPhase('discussion');
//       setTimeRemaining(session.discussion_time * 5); 
//     } else if (phase === 'discussion') {
//       setPhase('survey');
//       setTimeRemaining(session.survey_time * 5);
//     } else {
//       navigation.navigate('Survey', { 
//         sessionId: sessionId,
//         members: [] 
//       });
//     }
//   };

//   const getPhaseIcon = (currentPhase) => {
//     switch (currentPhase) {
//       case 'prep': return 'psychology';
//       case 'discussion': return 'forum';
//       case 'survey': return 'quiz';
//       default: return 'schedule';
//     }
//   };

//   const getPhaseColors = (currentPhase) => {
//     switch (currentPhase) {
//       case 'prep': return ['#FF9800', '#F57C00'];
//       case 'discussion': return ['#4CAF50', '#388E3C'];
//       case 'survey': return ['#2196F3', '#1976D2'];
//       default: return ['#9E9E9E', '#757575'];
//     }
//   };

//   if (loading) {
//     return (
//       <LinearGradient
//         colors={['#667eea', '#764ba2']}
//         style={styles.container}
//       >
//         <View style={styles.loadingContainer}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//             style={styles.loadingCard}
//           >
//             <View style={styles.loadingIconContainer}>
//               <Icon name="hourglass-empty" size={48} color="rgba(255,255,255,0.8)" />
//             </View>
//             <Text style={styles.loadingTitle}>Loading Session</Text>
//             <Text style={styles.loadingSubtitle}>Preparing your discussion environment...</Text>
//           </LinearGradient>
//         </View>
//       </LinearGradient>
//     );
//   }

//   if (!sessionId || !session) {
//     return (
//       <LinearGradient
//         colors={['#667eea', '#764ba2']}
//         style={styles.container}
//       >
//         <View style={styles.errorContainer}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//             style={styles.errorCard}
//           >
//             <View style={styles.errorIconContainer}>
//               <Icon name="error-outline" size={64} color="rgba(255,255,255,0.8)" />
//             </View>
//             <Text style={styles.errorTitle}>Session Not Found</Text>
//             <Text style={styles.errorSubtitle}>Unable to load session details</Text>
//             <TouchableOpacity 
//               style={styles.backButtonContainer}
//               onPress={() => navigation.goBack()}
//             >
//               <LinearGradient
//                 colors={['#F44336', '#D32F2F']}
//                 style={styles.backButtonGradient}
//               >
//                 <Icon name="arrow-back" size={20} color="#fff" />
//                 <Text style={styles.backButtonText}>Go Back</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </LinearGradient>
//         </View>
//       </LinearGradient>
//     );
//   }

//   return (
//     <LinearGradient
//       colors={['#667eea', '#764ba2', '#667eea']}
//       style={styles.container}
//     >
//       <View style={styles.contentContainer}>
//         {/* Header Section - Removed session ID */}
//         <View style={styles.header}>
//           {/* <LinearGradient
//             colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
//             style={styles.headerIconContainer}
//           >
//             <Icon name="groups" size={32} color="#fff" />
//           </LinearGradient> */}
//           <Text style={styles.headerTitle}>Group Discussion</Text>
//         </View>

//         {/* Topic Card - Moved to top */}
//         <View style={styles.topicCard}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//             start={{x: 0, y: 0}}
//             end={{x: 1, y: 1}}
//             style={styles.topicGradient}
//           >
//             <View style={styles.topicHeader}>
//               <View style={styles.topicIconContainer}>
//                 <Icon name="lightbulb-outline" size={24} color="#FFD700" />
//               </View>
//               <Text style={styles.topicLabel}>Discussion Topic</Text>
//             </View>
//             <Text style={styles.topic}>{topic}</Text>
//           </LinearGradient>
//         </View>

//         {/* Timer Section - Made bigger */}
//         <View style={styles.timerSection}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//             style={styles.timerContainer}
//           >
//             <View style={styles.timerHeader}>
//               <Icon name="timer" size={32} color="#fff" />
//               <Text style={styles.timerTitle}>Time Remaining</Text>
//             </View>
//             <View style={styles.timerWrapper}>
//               <Timer 
//                 duration={
//                   phase === 'prep' ? session.prep_time :
//                   phase === 'discussion' ? session.discussion_time :
//                   session.survey_time 
//                 }
//                 onComplete={handlePhaseComplete}
//                 active={timerActive}
//                 initialTimeRemaining={timeRemaining}
//                 onTick={(remaining) => setTimeRemaining(remaining)}
//                 textStyle={styles.timerText}
//               />
//             </View>
//           </LinearGradient>
//         </View>

//         {/* Phase Progress Indicators */}
//         <View style={styles.progressContainer}>
//           <View style={styles.progressSteps}>
//             {['prep', 'discussion', 'survey'].map((stepPhase, index) => (
//               <View key={stepPhase} style={styles.stepContainer}>
//                 <View style={[
//                   styles.stepCircle,
//                   phase === stepPhase && styles.stepCircleActive,
//                   index < ['prep', 'discussion', 'survey'].indexOf(phase) && styles.stepCircleCompleted
//                 ]}>
//                   <LinearGradient
//                     colors={phase === stepPhase || index < ['prep', 'discussion', 'survey'].indexOf(phase) 
//                       ? getPhaseColors(stepPhase) 
//                       : ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
//                     style={styles.stepGradient}
//                   >
//                     <Icon 
//                       name={getPhaseIcon(stepPhase)} 
//                       size={26} 
//                       color={phase === stepPhase || index < ['prep', 'discussion', 'survey'].indexOf(phase) ? '#fff' : 'rgba(255,255,255,0.6)'} 
//                     />
//                   </LinearGradient>
//                 </View>
//                 <Text style={[
//                   styles.stepLabel,
//                   phase === stepPhase && styles.stepLabelActive
//                 ]}>
//                   {stepPhase === 'prep' ? 'Prep' : 
//                    stepPhase === 'discussion' ? 'Discuss' : 'Survey'}
//                 </Text>
//                 {index < 2 && <View style={styles.stepConnector} />}
//               </View>
//             ))}
//           </View>
//         </View>

//         {/* Action Hints */}
//         <View style={styles.hintsContainer}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
//             style={styles.hintsGradient}
//           >
//             <Icon name="info-outline" size={20} color="rgba(255,255,255,0.8)" />
//             <Text style={styles.hintsText}>
//               {phase === 'prep' ? 'Use this time to think about the topic and organize your thoughts' :
//                phase === 'discussion' ? 'Actively participate in the group discussion' :
//                'The survey will begin automatically when the timer ends'}
//             </Text>
//           </LinearGradient>
//         </View>
//       </View>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   contentContainer: {
//     flex: 1,
//     padding: 20,
//     paddingTop: 25,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   loadingCard: {
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     width: '100%',
//   },
//   loadingIconContainer: {
//     marginBottom: 20,
//   },
//   loadingTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   loadingSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     lineHeight: 22,
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   errorCard: {
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     width: '100%',
//   },
//   errorIconContainer: {
//     marginBottom: 20,
//   },
//   errorTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   errorSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     marginBottom: 24,
//     lineHeight: 22,
//   },
//   backButtonContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     width: '100%',
//   },
//   backButtonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//   },
//   backButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   headerIconContainer: {
//     borderRadius: 30,
//     padding: 16,
//     marginBottom: 16,
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: '800',
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 4,
//     textShadowColor: 'rgba(0,0,0,0.3)',
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   topicCard: {
//     borderRadius: 20,
//     marginBottom: 24,
//     overflow: 'hidden',
//   },
//   topicGradient: {
//     padding: 24,
//   },
//   topicHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   topicIconContainer: {
//     marginRight: 12,
//   },
//   topicLabel: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   topic: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.9)',
//     lineHeight: 24,
//     textAlign: 'center',
//   },
//   timerSection: {
//     marginBottom: 24,
//   },
//   timerContainer: {
//     borderRadius: 20,
//     padding: 32,
//     alignItems: 'center',
//     minHeight: 200,
//   },
//   timerHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   timerTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#fff',
//     marginLeft: 12,
//   },
//   timerWrapper: {
//     width: '100%',
//     alignItems: 'center',
//     flex: 1,
//     justifyContent: 'center',
//   },
//   progressContainer: {
//     marginBottom: 20,
//   },
//   progressSteps: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   stepContainer: {
//     alignItems: 'center',
//     position: 'relative',
//   },
//   stepCircle: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   stepGradient: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   stepLabel: {
//     fontSize: 12,
//     color: 'rgba(255,255,255,0.6)',
//     fontWeight: '500',
//     padding: 7,
//   },
//   stepLabelActive: {
//     color: '#fff',
//     fontWeight: '600',
//   },
//   stepConnector: {
//     position: 'absolute',
//     top: 20,
//     left: 40,
//     width: 40,
//     height: 2,
//     backgroundColor: 'rgba(255,255,255,0.3)',
//   },
//   hintsContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   hintsGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//   },
//   hintsText: {
//     flex: 1,
//     fontSize: 14,
//     color: 'rgba(255,255,255,0.8)',
//     marginLeft: 12,
//     lineHeight: 20,
//   },
//   timerText: {
//     fontSize: 48,
//     fontWeight: '800',
//     color: '#fff',
//   },
// });

// // import React, { useState, useEffect } from 'react';
// // import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
// // import api from '../services/api';
// // import auth from '../services/auth';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import Timer from '../components/Timer';
// // import { globalStyles, colors, layout } from '../assets/globalStyles';
// // import Icon from 'react-native-vector-icons/MaterialIcons';
// // import HamburgerHeader from '../components/HamburgerHeader';

// // export default function GdSessionScreen({ navigation, route }) {
// //   const { sessionId } = route.params || {};
// //   const [session, setSession] = useState(null);
// //   const [phase, setPhase] = useState('prep');
// //   const [timerActive, setTimerActive] = useState(true);
// //   const [loading, setLoading] = useState(true);
// //   const [timeRemaining, setTimeRemaining] = useState(0);
// //   const [topic, setTopic] = useState("");

// //   useEffect(() => {
// //     const syncPhaseWithServer = async () => {
// //       try {
// //         const response = await api.student.getSessionPhase(sessionId);
// //         if (response.data.phase !== phase) {
// //           setPhase(response.data.phase);
// //           const remainingSeconds = Math.max(0, 
// //             (new Date(response.data.end_time) - new Date()) / 1000
// //           );
// //           setTimeRemaining(remainingSeconds);
// //         }
// //       } catch (error) {
// //         console.log("Using local phase state as fallback");
// //       }
// //     };
    
// //     syncPhaseWithServer();
// //   }, [sessionId]);

// //   // Load session state from storage on mount
// //   useEffect(() => {
// //     const loadSessionState = async () => {
// //       try {
// //         const savedState = await AsyncStorage.getItem(`session_${sessionId}`);
// //         if (savedState) {
// //           const { phase: savedPhase, timeRemaining: savedTime } = JSON.parse(savedState);
// //           setPhase(savedPhase);
// //           setTimeRemaining(savedTime);
// //         }
// //       } catch (error) {
// //         console.log('Error loading session state:', error);
// //       }
// //     };

// //     if (sessionId) {
// //       loadSessionState();
// //     }
// //   }, [sessionId]);

// //   // Save session state to storage whenever it changes
// //   useEffect(() => {
// //     const saveSessionState = async () => {
// //       try {
// //         await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify({
// //           phase,
// //           timeRemaining
// //         }));
// //       } catch (error) {
// //         console.log('Error saving session state:', error);
// //       }
// //     };

// //     if (sessionId) {
// //       saveSessionState();
// //     }
// //   }, [phase, timeRemaining, sessionId]);

// //   // Handle back button press
// //   useEffect(() => {
// //     const backAction = () => {
// //       Alert.alert(
// //         "Session in Progress",
// //         "Are you sure you want to leave? The timer will continue running.",
// //         [
// //           {
// //             text: "Cancel",
// //             onPress: () => null,
// //             style: "cancel"
// //           },
// //           { 
// //             text: "Leave", 
// //             onPress: () => navigation.goBack() 
// //           }
// //         ]
// //       );
// //       return true;
// //     };

// //     const backHandler = BackHandler.addEventListener(
// //       "hardwareBackPress",
// //       backAction
// //     );

// //     return () => backHandler.remove();
// //   }, [navigation]);

// //   // Fetch session details and topic
// //   useEffect(() => {
// //     if (!sessionId) {
// //       setLoading(false);
// //       return;
// //     }

// //     const fetchSessionAndTopic = async () => {
// //       try {
// //         const authData = await auth.getAuthData();
        
// //         if (!authData?.token) {
// //           throw new Error('Authentication required');
// //         }

// //         // Fetch session details
// //         const response = await api.student.getSession(sessionId);
        
// //         if (response.data?.error) {
// //           throw new Error(response.data.error);
// //         }

// //         if (!response.data || !response.data.id) {
// //           throw new Error('Invalid session data received');
// //         }

// //         const sessionData = response.data;
// //         setSession(sessionData);

// //         // Fetch topic for the session's level - FIXED THIS PART
// //         try {
// //           const topicResponse = await api.student.getTopicForLevel(sessionData.level);
          
// //           // Check if the response structure is correct
// //           if (topicResponse.data && topicResponse.data.topic_text) {
// //             setTopic(topicResponse.data.topic_text);
// //           } else if (topicResponse.data && typeof topicResponse.data === 'string') {
// //             // Handle case where the response might be just the topic text
// //             setTopic(topicResponse.data);
// //           } else {
// //             // Use default topic if none found
// //             setTopic("Discuss the impact of technology on modern education");
// //           }
// //         } catch (topicError) {
// //           console.log('Failed to fetch session topic:', topicError);
// //           setTopic("Discuss the impact of technology on modern education");
// //         }

// //       } catch (error) {
// //         console.error('Failed to load session:', error);
// //         let errorMessage = error.message;
        
// //         if (error.response) {
// //           if (error.response.status === 404) {
// //             errorMessage = 'Session not found';
// //           } else if (error.response.status === 403) {
// //             errorMessage = 'Not authorized to view this session';
// //           } else if (error.response.status === 500) {
// //             errorMessage = 'Server error - please try again later';
// //           }
// //         }
        
// //         Alert.alert(
// //           'Session Error',
// //           errorMessage,
// //           [{ 
// //             text: 'OK', 
// //             onPress: () => navigation.goBack()
// //           }]
// //         );
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchSessionAndTopic();
// //   }, [sessionId, navigation]);

// //   const handlePhaseComplete = () => {
// //     if (phase === 'prep') {
// //       setPhase('discussion');
// //       setTimeRemaining(session.discussion_time * 5); 
// //     } else if (phase === 'discussion') {
// //       setPhase('survey');
// //       setTimeRemaining(session.survey_time * 5);
// //     } else {
// //       navigation.navigate('Survey', { 
// //         sessionId: sessionId,
// //         members: [] 
// //       });
// //     }
// //   };

// //   if (loading) {
// //     return (
// //       <View style={styles.loading}>
// //         <Text>Loading session details...</Text>
// //       </View>
// //     );
// //   }

// //   if (!sessionId || !session) {
// //     return (
// //       <View style={styles.loading}>
// //         <Text>Failed to load session</Text>
// //         <TouchableOpacity onPress={() => navigation.goBack()}>
// //           <Text style={styles.backButton}>Go Back</Text>
// //         </TouchableOpacity>
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.container}>
// //       {/* Topic Display Area - Moved to top and made more prominent */}
// //       <View style={styles.topicContainer}>
// //         <Text style={styles.topicLabel}>Group Discussion Topic:</Text>
// //         <Text style={styles.topic}>{topic}</Text>
// //       </View>
   
// //       <Text style={styles.phaseText}>
// //         {phase === 'prep' ? 'Preparation' : 'Discussion'} Phase
// //       </Text>
      
// //       <Timer 
// //         duration={
// //           phase === 'prep' ? session.prep_time :
// //           phase === 'discussion' ? session.discussion_time :
// //           session.survey_time 
// //         }
// //         onComplete={handlePhaseComplete}
// //         active={timerActive}
// //         initialTimeRemaining={timeRemaining}
// //         onTick={(remaining) => setTimeRemaining(remaining)}
// //       />
    
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     padding: 20,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   loading: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   phaseText: {
// //     fontSize: 24,
// //     fontWeight: 'bold',
// //     marginBottom: 20,
// //   },
// //   topicContainer: {
// //     backgroundColor: '#f8f9fa',
// //     padding: 15,
// //     borderRadius: 10,
// //     marginBottom: 20,
// //     width: '100%',
// //     borderWidth: 1,
// //     borderColor: '#e9ecef',
// //   },
// //   topicLabel: {
// //     fontSize: 16,
// //     fontWeight: 'bold',
// //     marginBottom: 10,
// //     color: '#495057',
// //     textAlign: 'center',
// //   },
// //   topic: {
// //     fontSize: 18,
// //     textAlign: 'center',
// //     color: '#212529',
// //     lineHeight: 24,
// //   },
// //   button: {
// //     padding: 15,
// //     backgroundColor: '#ddd',
// //     borderRadius: 5,
// //     marginTop: 20,
// //   },
// //   backButton: {
// //     color: 'blue',
// //     marginTop: 20,
// //   },
// // });

