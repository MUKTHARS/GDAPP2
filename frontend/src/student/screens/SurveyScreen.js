
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../services/api';
import auth from '../services/auth'; 
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HamburgerHeader from '../components/HamburgerHeader';
import MemberCard from '../components/MemberCard';


const seededShuffle = (array, seed) => {
  const shuffled = [...array];
  let currentSeed = seed;
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function SurveyScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [allQuestions, setAllQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
   const [timerCompleted, setTimerCompleted] = useState(false);
  const [confirmedQuestions, setConfirmedQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selections, setSelections] = useState({});
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [penalties, setPenalties] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSeed, setUserSeed] = useState(null);

 useEffect(() => {
    const initializeUserSeed = async () => {
      try {
        const authData = await auth.getAuthData();
        const seed = `${authData.userId}-${sessionId}`;
        setUserSeed(seed);
      } catch (error) {
        setUserSeed(Math.random().toString());
      }
    };
    initializeUserSeed();
  }, [sessionId]);

useEffect(() => {
 const fetchQuestions = async () => {
  if (!userSeed) return;

  try {
    const authData = await auth.getAuthData();
    const studentLevel = parseInt(authData.level) || 1;
    console.log('Student level from auth:', studentLevel);
    
    const questionsResponse = await api.get('/student/questions', {
      params: { 
        level: studentLevel,
        session_id: sessionId,
      }
    });
    
    console.log('Questions API response status:', questionsResponse.status);
    console.log('Questions API response data:', questionsResponse.data);
    
    let questionsData = questionsResponse.data;
    
    if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
      if (questionsData.data && Array.isArray(questionsData.data)) {
        questionsData = questionsData.data;
      } else if (Array.isArray(questionsData)) {
        // Already an array
      } else {
        const arrayKeys = Object.keys(questionsData).filter(key => Array.isArray(questionsData[key]));
        if (arrayKeys.length > 0) {
          questionsData = questionsData[arrayKeys[0]];
        } else {
          questionsData = [];
        }
      }
    }
    
    if (!Array.isArray(questionsData)) {
      console.log('Questions data is not array, using empty array');
      questionsData = [];
    }
    
    console.log('Processed questions data:', questionsData);
    
    if (questionsData.length === 0) {
      console.log('No questions returned from database, using fallback');
      questionsData = [
        { id: 'q1', text: 'Clarity of arguments', weight: 1.0 },
        { id: 'q2', text: 'Contribution to discussion', weight: 1.0 },
        { id: 'q3', text: 'Teamwork and collaboration', weight: 1.0 }
      ];
    } else {
      console.log(`Found ${questionsData.length} questions from database`);
    }
    
    setAllQuestions(questionsData);
    
    let numericSeed = 0;
    for (let i = 0; i < userSeed.length; i++) {
      numericSeed = (numericSeed * 31 + userSeed.charCodeAt(i)) % 1000000;
    }
    
    const shuffled = seededShuffle(questionsData, numericSeed);
    setShuffledQuestions(shuffled);
    setQuestions(shuffled);
    
    const initialSelections = {};
    shuffled.forEach((_, index) => {
      initialSelections[index] = {};
    });
    setSelections(initialSelections);
    
  } catch (error) {
    console.error('Questions fetch error:', error.response?.data || error.message);
    const defaultQuestions = [
      { id: 'q1', text: 'Clarity of arguments', weight: 1.0 },
      { id: 'q2', text: 'Contribution to discussion', weight: 1.0 },
      { id: 'q3', text: 'Teamwork and collaboration', weight: 1.0 }
    ];
    
    setAllQuestions(defaultQuestions);
    
    if (userSeed) {
      let numericSeed = 0;
      for (let i = 0; i < userSeed.length; i++) {
        numericSeed = (numericSeed * 31 + userSeed.charCodeAt(i)) % 1000000;
      }
      const shuffled = seededShuffle(defaultQuestions, numericSeed);
      setShuffledQuestions(shuffled);
      setQuestions(shuffled);
      
      const initialSelections = {};
      shuffled.forEach((_, index) => {
        initialSelections[index] = {};
      });
      setSelections(initialSelections);
    }
  }
};

  fetchQuestions();
}, [sessionId, userSeed]);

 useEffect(() => {
    let timerInterval;
    
    const startTimer = async () => {
        try {
            setIsTimedOut(false);
            setTimeRemaining(30);
            setTimerCompleted(false); // Reset timer completion state
            
            await api.student.startQuestionTimer(sessionId, currentQuestion + 1);
            
            timerInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerInterval);
                        setIsTimedOut(true);
                        setTimerCompleted(true); // Mark timer as completed
                        // handleTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
        } catch (err) {
            console.log('Timer setup error:', err);
            timerInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerInterval);
                        setIsTimedOut(true);
                        setTimerCompleted(true); // Mark timer as completed
                        // handleTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };
    
    
    startTimer();
    
    return () => {
        clearInterval(timerInterval);
        // clearInterval(timeoutCheckInterval);
    };
  }, [currentQuestion]);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const response = await api.student.getSessionParticipants(sessionId);
        
        let participants = [];
        if (Array.isArray(response.data)) {
          participants = response.data;
        } else if (response.data?.data) {
          participants = response.data.data;
        }
        
        const authData = await auth.getAuthData();
        const filteredParticipants = participants.filter(
          participant => participant.id !== authData.userId
        );
        
        setMembers(filteredParticipants);
        setError(null);
        
        setSelections(prev => {
          const newSelections = {...prev};
          shuffledQuestions.forEach((_, index) => {
            if (!newSelections[index]) {
              newSelections[index] = {};
            }
          });
          return newSelections;
        });
      } catch (err) {
        setError('Failed to load participants');
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (shuffledQuestions.length > 0) {
      fetchParticipants();
    }
  }, [sessionId, shuffledQuestions]);

const handleSelect = (rank, memberId) => {
  setSelections(prev => {
    const currentSelections = { ...prev[currentQuestion] };
    
    // Handle removal case (when memberId is null)
    if (memberId === null) {
      // Remove this specific rank
      delete currentSelections[rank];
    } else {
      // Handle selection case
      
      // First, check if this member is already ranked in a different position
      const existingRank = Object.entries(currentSelections).find(
        ([r, id]) => id === memberId
      );
      
      // If member is already ranked elsewhere, remove that ranking
      if (existingRank) {
        delete currentSelections[existingRank[0]];
      }
      
      // Also check if this rank is already assigned to someone else
      if (currentSelections[rank]) {
        delete currentSelections[rank];
      }
      
      // Add the new ranking
      currentSelections[rank] = memberId;
    }
    
    return {
      ...prev,
      [currentQuestion]: currentSelections
    };
  });
};

 const confirmCurrentQuestion = async () => {
    const currentSelections = selections[currentQuestion] || {};
    const hasAtLeastOneRank = Object.keys(currentSelections).length > 0;
    
    // Check if timer is still running
    if (!timerCompleted && timeRemaining > 0) {
      Alert.alert(
        "Timer Still Running",
        "Please wait for the timer to complete before proceeding to the next question.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }
    
    if (!hasAtLeastOneRank && !penalties[currentQuestion]) {
        Alert.alert(
            "Incomplete Ranking",
            "You haven't selected any rankings for this question. " +
            "You'll receive a penalty if you proceed without selections.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Proceed Anyway",
                    onPress: async () => {
                        try {
                            const authData = await auth.getAuthData();
                            await api.student.applyQuestionPenalty(
                                sessionId,
                                currentQuestion + 1,
                                authData.userId
                            );
                            setPenalties(prev => ({
                                ...prev,
                                [currentQuestion]: true
                            }));
                            proceedToNextQuestion(true);
                        } catch (err) {
                            console.log('Penalty application error:', err);
                        }
                    }
                }
            ]
        );
        return;
    }

    proceedToNextQuestion(true);
  };

const proceedToNextQuestion = async (isPartial = false) => {
    setIsSubmitting(true);
    
    try {
        const currentSelections = selections[currentQuestion] || {};
        if (Object.keys(currentSelections).length > 0) {
            const shuffledQuestion = shuffledQuestions[currentQuestion];
            const questionNumber = currentQuestion + 1;
            
            const isFinal = !isPartial && (currentQuestion === shuffledQuestions.length - 1);
            
            const responseData = {
                sessionId,
                responses: {
                    [questionNumber]: currentSelections
                },
                isPartial: isPartial,
                isFinal: isFinal
            };
            
            console.log('Submitting survey data - isFinal:', isFinal, 'isPartial:', isPartial);
            await api.student.submitSurvey(responseData, isFinal);
        }

        setConfirmedQuestions(prev => [...prev, currentQuestion]);
        
        if (currentQuestion === shuffledQuestions.length - 1) {
            // REPLACE instead of navigate to prevent going back
            navigation.replace('Waiting', { 
                sessionId,
                surveyCompleted: true // Add this flag
            });
        } else {
            setCurrentQuestion(prev => prev + 1);
        }
    } catch (error) {
        console.error('Error submitting survey:', error);
        Alert.alert('Error', 'Failed to submit survey. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
};

// const proceedToNextQuestion = async (isPartial = false) => {
//     setIsSubmitting(true);
    
//     try {
//         const currentSelections = selections[currentQuestion] || {};
//         if (Object.keys(currentSelections).length > 0) {
//             const shuffledQuestion = shuffledQuestions[currentQuestion];
//             const questionNumber = currentQuestion + 1;
            
//             const isFinal = !isPartial && (currentQuestion === shuffledQuestions.length - 1);
            
//             const responseData = {
//                 sessionId,
//                 responses: {
//                     [questionNumber]: currentSelections
//                 },
//                 isPartial: isPartial,
//                 isFinal: isFinal
//             };
            
//             console.log('Submitting survey data - isFinal:', isFinal, 'isPartial:', isPartial);
//             await api.student.submitSurvey(responseData, isFinal);
//         }

//         setConfirmedQuestions(prev => [...prev, currentQuestion]);
        
//         if (currentQuestion === shuffledQuestions.length - 1) {
//             navigation.replace('Waiting', { sessionId });
//         } else {
//             setCurrentQuestion(prev => prev + 1);
//         }
//     } catch (error) {
//         console.error('Error submitting survey:', error);
//         Alert.alert('Error', 'Failed to submit survey. Please try again.');
//     } finally {
//         setIsSubmitting(false);
//     }
// };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
            </View>
            <Text style={styles.loadingTitle}>Loading Survey</Text>
            <Text style={styles.loadingSubtitle}>Preparing your evaluation form...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </View>
    );
  }

  const currentRankings = selections[currentQuestion] || {};

  return (
    <View style={styles.container}>
  
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Peer Evaluation</Text>
            <Text style={styles.headerSubtitle}>Rate your teammates' performance</Text>
          </View>

          {/* Compact Timer & Question Section */}
          <View style={styles.topSection}>
            {/* Timer Row */}
            <View style={styles.timerRow}>
              <View style={styles.timerContainer}>
                <Icon name="timer" size={20} color="#4F46E5" />
                <Text style={styles.timerText}>{timeRemaining}s</Text>
              </View>
              
              
            </View>
            
            {/* Question Row */}
            <View style={styles.questionRow}>
              <Text style={styles.questionNumber}>Q{currentQuestion + 1}</Text>
              <Text style={styles.question}>
                {shuffledQuestions[currentQuestion]?.text || 'Question loading...'}
              </Text>
            </View>

            {/* Current Rankings Row */}
            <View style={styles.rankingsRow}>
              <Text style={styles.rankingsLabel}>Current Rankings:</Text>
              <View style={styles.rankingsList}>
                {[1, 2, 3].map(rank => {
                  const selectedMember = members.find(m => m.id === currentRankings[rank]);
                  return (
                    <View key={rank} style={styles.rankingItem}>
                      <Text style={styles.rankEmoji}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </Text>
                      <Text style={styles.rankingName}>
                        {selectedMember ? selectedMember.name : 'Not selected'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Main Participants List */}
          <View style={styles.participantsSection}>
            <Text style={styles.participantsTitle}>
              Participants ({members.length})
            </Text>
            <View style={styles.participantsList}>
              {members.map((member) => (
                <MemberCard 
                  key={member.id}
                  member={member}
                  onSelect={handleSelect}
                  selections={selections}
                  currentRankings={currentRankings}
                />
              ))}
            </View>
          </View>

          {/* Bottom Navigation */}
          <View style={styles.navigationContainer}>
            <View style={styles.navigation}>
              {/* {currentQuestion > 0 && (
                <TouchableOpacity
                  style={styles.navButtonContainer}
                  onPress={() => setCurrentQuestion(currentQuestion - 1)}
                  disabled={isSubmitting}
                >
                  <View style={styles.navButton}>
                    <Icon name="arrow-back" size={20} color="#F8FAFC" />
                    <Text style={styles.navButtonText}>Previous</Text>
                  </View>
                </TouchableOpacity>
              )} */}
              
              <View style={styles.centerAction}>
                {confirmedQuestions.includes(currentQuestion) ? (
                  <View style={styles.confirmedContainer}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.confirmedBadge}
                    >
                      <Icon name="check-circle" size={20} color="#fff" />
                      <Text style={styles.confirmedText}>Confirmed</Text>
                    </LinearGradient>
                    {currentQuestion < shuffledQuestions.length - 1 && (
                      <TouchableOpacity
                        style={styles.nextButtonContainer}
                        onPress={() => setCurrentQuestion(currentQuestion + 1)}
                        disabled={isSubmitting}
                      >
                        <LinearGradient
                          colors={['#3B82F6', '#2563EB']}
                          style={styles.nextButton}
                        >
                          <Text style={styles.nextButtonText}>Next Question</Text>
                          <Icon name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
    style={styles.confirmButtonContainer}
    onPress={confirmCurrentQuestion}
    disabled={
      (Object.keys(currentRankings).length < 1 || isSubmitting || 
      (!timerCompleted && timeRemaining > 0)) // Disable if timer still running
    }
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={((Object.keys(currentRankings).length < 1 || isSubmitting || 
               (!timerCompleted && timeRemaining > 0)) // Same condition for colors
        ? ['#6B7280', '#4B5563']
        : currentQuestion < shuffledQuestions.length - 1 
          ? ['#10B981', '#059669'] 
          : ['#F59E0B', '#D97706'])}
      style={styles.confirmButton}
    >
      {isSubmitting ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <>
          <Text style={styles.confirmButtonText}>
            {(!timerCompleted && timeRemaining > 0) 
              ? `Wait ${timeRemaining}s for next question` 
              : currentQuestion < shuffledQuestions.length - 1 
                ? 'Confirm & Next' 
                : 'Submit Survey'}
          </Text>
          {(!timerCompleted && timeRemaining > 0) ? null : (
            <Icon 
              name={currentQuestion < shuffledQuestions.length - 1 ? "check" : "send"} 
              size={20} 
              color="#fff" 
            />
          )}
        </>
      )}
    </LinearGradient>
  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1bff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 25,
    paddingHorizontal: 20,
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
  errorText: {
    color: '#F8FAFC',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
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
  topSection: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  timeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  penaltyText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
    lineHeight: 22,
  },
  rankingsRow: {
    marginTop: 8,
  },
  rankingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  rankingsList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  rankEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  rankingName: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  participantsSection: {
    flex: 1,
    marginBottom: 16,
  },
  participantsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
    textAlign: 'center',
  },
  participantsList: {
    paddingBottom: 10,
  },
  memberCardContainer: {
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.5,
    elevation: 12,
  },
  selectionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(79,70,229,0.6)',
  },
  memberInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  profileImageGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  departmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDepartment: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginLeft: 4,
  },
selectedRankContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
},
  rankBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  rankBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  removeButtonContainer: {
    marginLeft: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rankingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  rankButtonContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rankButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledRankButton: {
    opacity: 0.5,
  },
  rankButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  rankButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
  },
  navigationContainer: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  navButton: {
    backgroundColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  centerAction: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  confirmedContainer: {
    alignItems: 'center',
    gap: 12,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confirmedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  nextButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  confirmButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
});