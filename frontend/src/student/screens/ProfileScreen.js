import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import HamburgerHeader from '../components/HamburgerHeader';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

 useEffect(() => {
    fetchUserProfile();
    fetchSessionHistory();
  }, []);

 const fetchSessionHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.student.getSessionHistory();
      if (response.data) {
        setSessionHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching session history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };


const fetchUserProfile = async () => {
    try {
        const response = await api.student.getProfile();
        
        if (response.data && Object.keys(response.data).length > 0) {
            setUserData(response.data);
            
            // Store user data in AsyncStorage for quick access
            await AsyncStorage.setItem('userID', response.data.id);
            await AsyncStorage.setItem('userEmail', response.data.email);
            await AsyncStorage.setItem('userName', response.data.full_name);
            await AsyncStorage.setItem('userRollNumber', response.data.roll_number || '');
            await AsyncStorage.setItem('userDepartment', response.data.department);
            await AsyncStorage.setItem('userLevel', response.data.current_gd_level.toString());
            await AsyncStorage.setItem('userPhoto', response.data.photo_url || '');
        } else {
            // Fallback to stored data if API fails
            const fallbackData = {
                id: await AsyncStorage.getItem('userID'),
                email: await AsyncStorage.getItem('userEmail'),
                full_name: await AsyncStorage.getItem('userName'),
                roll_number: await AsyncStorage.getItem('userRollNumber'),
                department: await AsyncStorage.getItem('userDepartment'),
                current_gd_level: parseInt(await AsyncStorage.getItem('userLevel') || '1'),
                photo_url: await AsyncStorage.getItem('userPhoto')
            };
            setUserData(fallbackData);
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        // Use stored data as fallback
        const fallbackData = {
            id: await AsyncStorage.getItem('userID'),
            email: await AsyncStorage.getItem('userEmail'),
            full_name: await AsyncStorage.getItem('userName'),
            roll_number: await AsyncStorage.getItem('userRollNumber'),
            department: await AsyncStorage.getItem('userDepartment'),
            current_gd_level: parseInt(await AsyncStorage.getItem('userLevel') || '1'),
            photo_url: await AsyncStorage.getItem('userPhoto')
        };
        setUserData(fallbackData);
    } finally {
        setLoading(false);
    }
};

  const getLevelBadge = (level) => {
    const badges = {
      1: { color: '#4CAF50', label: 'Beginner' },
      2: { color: '#2196F3', label: 'Intermediate' },
      3: { color: '#FF9800', label: 'Advanced' },
      4: { color: '#9C27B0', label: 'Expert' },
      5: { color: '#F44336', label: 'Master' }
    };
    return badges[level] || { color: '#667eea', label: `Level ${level}` };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingTitle}>Loading Profile</Text>
            <Text style={styles.loadingSubtitle}>Please wait while we fetch your data...</Text>
          </View>
        </View>
      </View>
    );
  }

  const badge = getLevelBadge(userData?.current_gd_level);

  const renderSessionItem = ({ item }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionVenue}>{item.venue_name}</Text>
        <View style={[
          styles.statusBadge,
          item.cleared ? styles.clearedBadge : styles.notClearedBadge
        ]}>
          <Text style={styles.statusText}>
            {item.cleared ? 'CLEARED' : 'NOT CLEARED'}
          </Text>
        </View>
      </View>

      <View style={styles.sessionDetails}>
        <Text style={styles.sessionTime}>
          {new Date(item.start_time).toLocaleDateString()} • 
          {new Date(item.start_time).toLocaleTimeString()}
        </Text>
        
        <Text style={styles.sessionLevel}>Level {item.session_level}</Text>
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{item.final_score.toFixed(1)}</Text>
        </View>
        
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Penalty</Text>
          <Text style={styles.penaltyValue}>-{item.total_penalty.toFixed(1)}</Text>
        </View>
        
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Rank</Text>
          <Text style={styles.rankValue}>
            {item.student_rank > 0 ? `#${item.student_rank}` : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.participantInfo}>
        <Text style={styles.participantText}>
          {item.total_participants} participants • 
          {item.questions_answered}/{item.total_questions} questions
        </Text>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <HamburgerHeader />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentContainer}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {userData?.photo_url ? (
                <Image
                  source={{ uri: userData.photo_url }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  style={styles.avatarPlaceholder}
                >
                  <Icon name="person" size={40} color="#fff" />
                </LinearGradient>
              )}
            </View>
            
            <Text style={styles.userName}>{userData?.full_name || 'Student'}</Text>
            
            <View style={styles.levelBadge}>
              <LinearGradient
                colors={[badge.color, badge.color + 'DD']}
                style={styles.badgeGradient}
              >
                <Text style={styles.badgeText}>{badge.label}</Text>
                <Text style={styles.levelText}>Level {userData?.current_gd_level}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Profile Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Icon name="email" size={20} color="#4F46E5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{userData?.email || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Icon name="school" size={20} color="#4F46E5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>{userData?.department || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Icon name="badge" size={20} color="#4F46E5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Roll Number</Text>
                  <Text style={styles.detailValue}>{userData?.roll_number || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Icon name="star" size={20} color="#4F46E5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>GD Level</Text>
                  <Text style={styles.detailValue}>
                    Level {userData?.current_gd_level} - {badge.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Session History</Text>
            
            {historyLoading ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : sessionHistory.length > 0 ? (
              <FlatList
                data={sessionHistory}
                renderItem={renderSessionItem}
                keyExtractor={(item) => item.session_id}
                scrollEnabled={false}
                contentContainerStyle={styles.historyList}
              />
            ) : (
              <View style={styles.emptyHistory}>
                <Icon name="history" size={48} color="#94A3B8" />
                <Text style={styles.emptyHistoryText}>No session history yet</Text>
                <Text style={styles.emptyHistorySubtext}>
                  Participate in group discussions to see your results here
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    borderWidth: 1,
    borderColor: '#334155',
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 80,
  },
  contentContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#334155',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#334155',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  levelBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  levelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
   refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  
  refreshButtonText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  historyContainer: {
    marginTop: 24,
  },
  
sessionCard: {
  backgroundColor: '#090d13ff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#334155',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 2,
},
  
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
sessionVenue: {
  fontSize: 16,
  fontWeight: '600',
  color: '#F8FAFC',
},
  
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
clearedBadge: {
  backgroundColor: 'rgba(16, 185, 129, 0.2)',
},

notClearedBadge: {
  backgroundColor: 'rgba(239, 68, 68, 0.2)',
},

statusText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#F8FAFC',
},
  
  sessionDetails: {
    marginBottom: 12,
  },
  
 sessionTime: {
  fontSize: 14,
  color: '#94A3B8',
  marginBottom: 4,
},
  
  sessionLevel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  
scoreContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
  padding: 12,
  backgroundColor: 'rgba(51, 65, 85, 0.3)',
  borderRadius: 8,
},
  
  scoreItem: {
    alignItems: 'center',
  },
  
  scoreLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  
  penaltyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  
  rankValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  
  participantInfo: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  
  participantText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  
  emptyHistory: {
    alignItems: 'center',
    padding: 32,
  },
  
  emptyHistoryText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 4,
  },
  
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});