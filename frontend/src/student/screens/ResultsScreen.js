import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';
import auth from '../services/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import HamburgerHeader from '../components/HamburgerHeader';

const ResultItem = ({ item, index }) => {
  // Ensure numeric values
  const totalScore = typeof item.total_score === 'string' ? 
    parseFloat(item.total_score) : item.total_score || 0;
  const penaltyPoints = typeof item.penalty_points === 'string' ? 
    parseFloat(item.penalty_points) : item.penalty_points || 0;
  const finalScore = typeof item.final_score === 'string' ? 
    parseFloat(item.final_score) : totalScore - penaltyPoints;
  const biasedQuestions = item.biased_questions || 0;
  
  // Use the photo_url from the item, fallback to avatar API
  const profileImage = item.photo_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff`;
  
  const [showPenaltyDetails, setShowPenaltyDetails] = useState(false);

  const getRankColors = (position) => {
    switch (position) {
      case 0: return ['#FFD700', '#FFA000']; // Gold
      case 1: return ['#C0C0C0', '#9E9E9E']; // Silver
      case 2: return ['#CD7F32', '#8D6E63']; // Bronze
      default: return ['#4F46E5', '#7C3AED']; // Purple gradient
    }
  };

  // Generate penalty details based on biased questions count
 const penaltyDetails = biasedQuestions > 0 ? [
    { 
      points: penaltyPoints, 
      reason: `${biasedQuestions} biased ranking(s)`, 
      description: 'Deviated significantly from consensus ratings'
    }
  ] : [];

 
  return (
    <View style={[styles.resultItem, { opacity: 0.9 + (index * 0.01) }]}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.rankContainer}>
            <LinearGradient
              colors={getRankColors(index)}
              style={styles.rankBadge}
            >
              <Text style={styles.rankText}>{index + 1}</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.profileContainer}>
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
              onError={() => console.log('Image load error')}
            />
          </View>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.nameText}>{item.name}</Text>
            
            {/* Scores Container */}
            <View style={styles.scoresContainer}>
              {/* Total Score */}
              <View style={styles.scoreItem}>
                <Icon name="add-circle" size={16} color="#10B981" />
                <Text style={styles.scoreText}>{totalScore.toFixed(1)}</Text>
              </View>
              
              {/* Penalty Points */}
              {penaltyPoints > 0 && (
                <View style={styles.scoreItem}>
                  <Icon name="remove-circle" size={16} color="#EF4444" />
                  <Text style={styles.penaltyText}>-{penaltyPoints.toFixed(1)}</Text>
                  <TouchableOpacity 
                    onPress={() => setShowPenaltyDetails(!showPenaltyDetails)}
                    style={styles.penaltyInfoButton}
                  >
                    <Icon name="info-outline" size={14} color="#F59E0B" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Final Score */}
              <View style={styles.finalScoreContainer}>
                <Text style={styles.finalScoreText}>{finalScore.toFixed(1)}</Text>
                <Text style={styles.finalScoreLabel}>Final</Text>
              </View>
            </View>

            {/* Penalty Details */}
            {showPenaltyDetails && penaltyPoints > 0 && (
              <View style={styles.penaltyDetailsContainer}>
                <View style={styles.penaltyDetailItem}>
                  <Icon name="warning" size={14} color="#F59E0B" />
                  <Text style={styles.penaltyDetailText}>
                    {biasedQuestions} biased ranking{biasedQuestions !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.penaltyDetailItem}>
                  <Icon name="error-outline" size={12} color="#EF4444" />
                  <Text style={styles.penaltyDetailSmallText}>
                    Ratings differed significantly from group consensus
                  </Text>
                </View>
                <View style={styles.penaltyDetailItem}>
                  <Icon name="info-outline" size={12} color="#3B82F6" />
                  <Text style={styles.penaltyDetailSmallText}>
                    -1 point per significant deviation
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ResultsScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPenaltyInfo, setShowPenaltyInfo] = useState(false);
  const [levelUpModal, setLevelUpModal] = useState(false);
    const [promotionData, setPromotionData] = useState(null);

 useEffect(() => {
        const fetchResultsAndCheckLevel = async () => {
            try {
                setLoading(true);
                
                // Fetch results first
                const response = await api.student.getResults(sessionId);
                
                console.log('Results API response:', response.data);
                
                if (response.data?.results) {
                    const processedResults = response.data.results
                        .map(item => ({
                            ...item,
                            total_score: typeof item.total_score === 'string' ? 
                                parseFloat(item.total_score) : item.total_score || 0,
                            penalty_points: typeof item.penalty_points === 'string' ? 
                                parseFloat(item.penalty_points) : item.penalty_points || 0,
                            final_score: typeof item.final_score === 'string' ? 
                                parseFloat(item.final_score) : 
                                (item.total_score || 0) - (item.penalty_points || 0),
                            biased_questions: item.biased_questions || 0
                        }))
                        .sort((a, b) => b.final_score - a.final_score);
                    
                    setResults(processedResults);
                    
                    // Check if current user was promoted
                    try {
                        const authData = await auth.getAuthData();
                        const promotionResponse = await api.student.checkLevelProgression(sessionId);
                        
                        if (promotionResponse.data.promoted) {
                            setPromotionData(promotionResponse.data);
                            setLevelUpModal(true);
                            
                            // Update local storage with new level
                            await AsyncStorage.setItem('userLevel', promotionResponse.data.new_level.toString());
                        }
                    } catch (promotionError) {
                        console.log('Level progression check failed:', promotionError);
                        // Continue without showing promotion modal
                    }
                } else {
                    setError('No results available for this session');
                }
            } catch (err) {
                setError('Failed to load results');
                console.error('Results error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResultsAndCheckLevel();
    }, [sessionId]);


  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await api.student.getResults(sessionId);
        
        console.log('Results API response:', response.data);
        
        if (response.data?.results) {
          // Process results to ensure correct data types
          const processedResults = response.data.results
            .map(item => ({
              ...item,
              // Ensure numeric values - handle both string and number types
              total_score: typeof item.total_score === 'string' ? 
                parseFloat(item.total_score) : item.total_score || 0,
              penalty_points: typeof item.penalty_points === 'string' ? 
                parseFloat(item.penalty_points) : item.penalty_points || 0,
              final_score: typeof item.final_score === 'string' ? 
                parseFloat(item.final_score) : 
                (item.total_score || 0) - (item.penalty_points || 0),
              biased_questions: item.biased_questions || 0
            }))
            // Sort by final_score descending as backup
            .sort((a, b) => b.final_score - a.final_score);
          
          setResults(processedResults);
        } else {
          setError('No results available for this session');
        }
      } catch (err) {
        setError('Failed to load results');
        console.error('Results error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);



  
const LevelUpModal = () => (
  <Modal
    visible={levelUpModal}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setLevelUpModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.levelUpModal}>
        <View style={styles.levelUpHeader}>
          <View style={styles.levelUpIcon}>
            <Icon name="emoji-events" size={48} color="#FFD700" />
          </View>
          <Text style={styles.levelUpTitle}>Level Up! 🎉</Text>
          <Text style={styles.levelUpSubtitle}>
            Congratulations on your outstanding performance!
          </Text>
        </View>
        
        <View style={styles.levelUpContent}>
          <Text style={styles.levelUpText}>
            You ranked #{promotionData?.rank} in this session and have been promoted to:
          </Text>
          
          <View style={styles.levelBadgeLarge}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              style={styles.levelBadgeGradient}
            >
              <Text style={styles.levelBadgeTextLarge}>
                Level {promotionData?.new_level}
              </Text>
            </LinearGradient>
          </View>
          
          <Text style={styles.levelUpInfo}>
            You can now participate in more advanced discussion sessions!
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.levelUpButton}
          onPress={() => {
            setLevelUpModal(false);
            // Refresh the profile screen by navigating to it with params
            navigation.navigate('Profile', { levelUpdated: true });
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.levelUpButtonGradient}
          >
            <Text style={styles.levelUpButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingTitle}>Loading Results</Text>
            <Text style={styles.loadingSubtitle}>Please wait while we fetch the session results...</Text>
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
            <View style={styles.errorIconContainer}>
              <Icon name="error-outline" size={64} color="#64748B" />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Results</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
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
      {/* <HamburgerHeader title="Session Results" /> */}
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.title}>Session Results</Text>
              <Text style={styles.subtitle}>Final rankings and scores</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => setShowPenaltyInfo(true)}
            style={styles.infoButton}
          >
            <Icon name="info" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="group" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{results.length}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="emoji-events" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>
                {results.length > 0 ? results[0].final_score?.toFixed(1) || '0.0' : '0.0'}
              </Text>
              <Text style={styles.statLabel}>Top Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="check-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>Completed</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Results List */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              Final Rankings ({results.length})
            </Text>
          </View>
          
          <View style={styles.resultsList}>
            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item, index) => item.student_id || `result-${index}`}
                renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="assessment" size={48} color="#6B7280" />
                </View>
                <Text style={styles.emptyTitle}>No Results Available</Text>
                <Text style={styles.emptyText}>
                  Results for this session are not yet available
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom feedback section */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.feedbackButton}
            onPress={() => navigation.navigate('Feedback', { sessionId })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.feedbackButtonGradient}
            >
              <View style={styles.feedbackButtonContent}>
                <Icon name="feedback" size={24} color="#fff" />
                <Text style={styles.feedbackButtonText}>Give Feedback</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.feedbackHint}>
            Help us improve your experience
          </Text>
        </View>
      </View>

      {/* Penalty Info Modal */}
{showPenaltyInfo && (
  <Modal
    visible={showPenaltyInfo}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowPenaltyInfo(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Penalty System</Text>
          <TouchableOpacity 
            onPress={() => setShowPenaltyInfo(false)}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <Text style={styles.modalDescription}>
            Penalties are applied when your ratings differ significantly from the group consensus:
          </Text>
          
          <View style={styles.penaltyRule}>
            <Icon name="warning" size={20} color="#F59E0B" />
            <Text style={styles.penaltyRuleText}>
              Deviation ≥ 2 points from average: -1 point per occurrence
            </Text>
          </View>
          
          <View style={styles.penaltyRule}>
            <Icon name="info" size={20} color="#3B82F6" />
            <Text style={styles.penaltyRuleText}>
              Average is calculated excluding self-ratings
            </Text>
          </View>
          
          <View style={styles.penaltyRule}>
            <Icon name="group" size={20} color="#10B981" />
            <Text style={styles.penaltyRuleText}>
              Designed to encourage fair and consistent evaluations
            </Text>
          </View>
        </View>
      </View>
    </View>
  </Modal>
)}
 <LevelUpModal />
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
    borderWidth: 1,
    borderColor: '#334155',
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
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoButton: {
    padding: 8,
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
    fontSize: 18,
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
  resultsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  profileContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyInfoButton: {
    marginLeft: 4,
    padding: 4,
  },
  finalScoreContainer: {
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  finalScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  finalScoreLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  penaltyDetailsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  penaltyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  penaltyDetailText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  penaltyDetailSmallText: {
    color: '#D1D5DB',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
    fontStyle: 'italic',
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
    marginTop: 20,
  },
  feedbackButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  feedbackButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  feedbackButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  feedbackHint: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 22,
  },
  penaltyRule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 12,
  },
  penaltyRuleText: {
    color: '#F8FAFC',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
     levelUpModal: {
            backgroundColor: '#1F2937',
            borderRadius: 20,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            alignItems: 'center',
        },
        levelUpHeader: {
            alignItems: 'center',
            marginBottom: 20,
        },
        levelUpIcon: {
            marginBottom: 16,
        },
        levelUpTitle: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFD700',
            marginBottom: 8,
            textAlign: 'center',
        },
        levelUpSubtitle: {
            fontSize: 16,
            color: '#D1D5DB',
            textAlign: 'center',
        },
        levelUpContent: {
            alignItems: 'center',
            marginBottom: 24,
        },
        levelUpText: {
            fontSize: 16,
            color: '#F3F4F6',
            textAlign: 'center',
            marginBottom: 20,
        },
        levelBadgeLarge: {
            marginBottom: 20,
        },
        levelBadgeGradient: {
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 25,
        },
        levelBadgeTextLarge: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
        },
        levelUpInfo: {
            fontSize: 14,
            color: '#9CA3AF',
            textAlign: 'center',
            fontStyle: 'italic',
        },
        levelUpButton: {
            width: '100%',
        },
        levelUpButtonGradient: {
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
        },
        levelUpButtonText: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#FFFFFF',
        },
});




