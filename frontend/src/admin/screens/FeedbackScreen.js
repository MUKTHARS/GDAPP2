import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../../admin/services/api';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const FeedbackItem = ({ item, onPress }) => {
  const getRatingColor = (rating) => {
    const colors = ['#ff4444', '#ff8800', '#ffbb33', '#00C851', '#007E33'];
    return colors[rating - 1] || '#607D8B';
  };

  return (
    <TouchableOpacity style={styles.feedbackItem} onPress={onPress}>
      <View style={styles.feedbackHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>Student ID: {item.student_id}</Text>
          <Text style={styles.studentDetails}>
            Session ID: {item.session_id}
          </Text>
        </View>
        <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(item.rating) }]}>
          <Text style={styles.ratingText}>{item.rating}/5</Text>
        </View>
      </View>
      
      {item.comments && (
        <Text style={styles.comments} numberOfLines={2}>
          "{item.comments}"
        </Text>
      )}
      
      <Text style={styles.date}>{item.created_at}</Text>
    </TouchableOpacity>
  );
};

const FeedbackStats = ({ stats }) => {
  const total = stats.total_feedbacks || 0;
  const average = stats.average_rating || 0;
  const distribution = stats.rating_distribution || {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Feedback Statistics</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total Feedbacks</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{average.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
      </View>

      <View style={styles.distributionContainer}>
        {[5, 4, 3, 2, 1].map(rating => (
          <View key={rating} style={styles.distributionRow}>
            <Text style={styles.ratingLabel}>{rating} ★</Text>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    width: total > 0 ? `${(distribution[rating] / total) * 100}%` : '0%',
                    backgroundColor: rating === 5 ? '#007E33' :
                                     rating === 4 ? '#00C851' :
                                     rating === 3 ? '#ffbb33' :
                                     rating === 2 ? '#ff8800' : '#ff4444'
                  }
                ]}
              />
            </View>
            <Text style={styles.countText}>{distribution[rating]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function AdminFeedbackScreen() {
  const navigation = useNavigation();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [selectedSession, setSelectedSession] = useState('');
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [selectedSession, page]);

  const loadSessions = async () => {
    try {
      const response = await api.admin.getSessions();
      setSessions(response.data || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

const loadFeedbacks = async () => {
    try {
        setLoading(true);
        const response = await api.admin.getSessionFeedbacks(
            selectedSession || undefined,
            page,
            20
        );
        
        // The response is now properly structured with data property
        if (response.data) {
            setFeedbacks(response.data.feedbacks || []);
            setTotalPages(response.data.pages || 1);
        }
    } catch (err) {
        setError('Failed to load feedbacks');
        console.error('Error loading feedbacks:', err);
    } finally {
        setLoading(false);
    }
};

const loadStats = async () => {
    try {
        setStatsLoading(true);
        const response = await api.admin.getFeedbackStats();
        const statsData = response.data.stats || response.data || {};
        setStats(statsData);
    } catch (err) {
        console.error('Error loading stats:', err);
        setStats({
            average_rating: 0,
            total_feedbacks: 0,
            rating_distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        });
    } finally {
        setStatsLoading(false);
    }
};

  const handleFeedbackPress = (feedback) => {
    setSelectedFeedback(feedback);
    setModalVisible(true);
  };

 const renderFeedbackModal = () => (
  <Modal
    visible={modalVisible}
    animationType="slide"
    transparent={true}
    onRequestClose={() => setModalVisible(false)}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {selectedFeedback && (
          <>
            <Text style={styles.modalTitle}>Feedback Details</Text>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Student Information</Text>
              <Text style={styles.modalText}>Student ID: {selectedFeedback.student_id}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Session Information</Text>
              <Text style={styles.modalText}>Session ID: {selectedFeedback.session_id}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Rating</Text>
              <View style={[styles.ratingBadge, styles.modalRating, 
                { backgroundColor: getRatingColor(selectedFeedback.rating) }]}>
                <Text style={styles.ratingText}>{selectedFeedback.rating}/5</Text>
              </View>
            </View>

            {selectedFeedback.comments && (
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Comments</Text>
                <Text style={styles.commentsFull}>"{selectedFeedback.comments}"</Text>
              </View>
            )}

            <Text style={styles.modalDate}>{selectedFeedback.created_at}</Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  </Modal>
);

  const getRatingColor = (rating) => {
    const colors = ['#ff4444', '#ff8800', '#ffbb33', '#00C851', '#007E33'];
    return colors[rating - 1] || '#607D8B';
  };

  if (loading && page === 1) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading feedbacks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Feedback</Text>

      {/* Statistics Section */}
      {!statsLoading && (
        <FeedbackStats stats={stats} />
      )}

      {/* Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Session:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedSession}
            style={styles.picker}
            onValueChange={(value) => {
              setSelectedSession(value);
              setPage(1);
            }}
          >
            <Picker.Item label="All Sessions" value="" />
            {sessions.map(session => (
              <Picker.Item 
                key={session.id} 
                label={session.session_name} 
                value={session.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Feedback List */}
      <FlatList
        data={feedbacks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FeedbackItem 
            item={item} 
            onPress={() => handleFeedbackPress(item)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>
              {selectedSession ? 'No feedback for selected session' : 'No feedback available'}
            </Text>
          )
        }
        refreshing={loading}
        onRefresh={loadFeedbacks}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>
          
          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
            onPress={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderFeedbackModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  distributionContainer: {
    marginTop: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    width: 40,
    fontSize: 12,
    color: '#333',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  countText: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
    color: '#666',
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
  },
  listContainer: {
    paddingBottom: 16,
  },
  feedbackItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  studentDetails: {
    fontSize: 12,
    color: '#666',
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  sessionLevel: {
    fontSize: 12,
    color: '#666',
  },
  comments: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 40,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: '#ccc',
  },
  pageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pageInfo: {
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  modalRating: {
    alignSelf: 'flex-start',
  },
  commentsFull: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  modalDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});