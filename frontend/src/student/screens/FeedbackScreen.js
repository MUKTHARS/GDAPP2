import React, { useState, useEffect} from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity,ScrollView,Button, ActivityIndicator, Alert } from 'react-native';
import { Rating } from 'react-native-ratings';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native'; 
export default function FeedbackScreen({ route, navigation }) {
    const { sessionId } = route.params;
    const [rating, setRating] = useState(0);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [existingFeedback, setExistingFeedback] = useState(null);
    const [checkingFeedback, setCheckingFeedback] = useState(true);
const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false)
    useEffect(() => {
        const checkFeedback = async () => {
            try {
                const response = await api.student.getFeedback(sessionId);
                // Check if response has data (not empty object)
                if (response.data && Object.keys(response.data).length > 0) {
                    setExistingFeedback(response.data);
                    setRating(response.data.rating || 3);
                    setComments(response.data.comments || '');
                }
            } catch (error) {
                console.log('Error checking feedback:', error);
            } finally {
                setCheckingFeedback(false);
            }
        };
        checkFeedback();
    }, [sessionId]);

const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
        Alert.alert('Invalid Rating', 'Please provide a rating between 1 and 5');
        return;
    }

    setSubmitting(true);
    try {
        // Make sure we're sending the data in the correct format
        console.log('Submitting feedback:', {
            session_id: sessionId,
            rating: rating,
            comments: comments
        });
        
        await api.student.submitFeedback(sessionId, rating, comments);
        Alert.alert('Success', 'Thank you for your feedback!');
        navigation.navigate('SessionBooking');
    } catch (error) {
        console.error('Feedback submission error details:', error.response?.data || error.message);
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
        setSubmitting(false);
    }
};

    if (checkingFeedback) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingTitle}>Loading Feedback</Text>
                        <Text style={styles.loadingSubtitle}>Please wait while we set up your feedback form...</Text>
                    </View>
                </View>
            </View>
        );
    }

 const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={star <= rating ? ['#FFD700', '#FFA000'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.starGradient}
            >
              <Icon
                name={star <= rating ? 'star' : 'star-border'}
                size={32}
                color={star <= rating ? '#fff' : '#94A3B8'}
              />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

    return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Session Feedback</Text>
          <Text style={styles.subtitle}>Help us improve your experience</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <View style={styles.ratingIconContainer}>
                <Icon name="grade" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.ratingLabel}>Rate Your Experience</Text>
            </View>
            <Text style={styles.ratingSubtext}>
              How would you rate this discussion session?
            </Text>
            {renderStars()}
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 ? 'Poor' : 
                 rating === 2 ? 'Fair' : 
                 rating === 3 ? 'Good' : 
                 rating === 4 ? 'Very Good' : 'Excellent'}
              </Text>
            )}
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackCard}>
    <View style={styles.feedbackHeader}>
      <View style={styles.feedbackIconContainer}>
        <Icon name="edit" size={24} color="#4F46E5" />
      </View>
      <Text style={styles.feedbackLabel}>Your Feedback</Text>
    </View>
    <Text style={styles.feedbackSubtext}>
      Share your thoughts about the session
    </Text>
    
    <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Tell us about your experience..."
          placeholderTextColor="#64748B"
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
    </View>
    
    <View style={styles.characterCount}>
      <Text style={styles.characterCountText}>
        {comments.length}/500 characters
      </Text>
    </View>
</View>

      {/* Submit Button */}
<View style={styles.bottomContainer}>
  <TouchableOpacity 
    style={[styles.submitButton, (submitting || !comments.trim() || rating === 0) && styles.submitButtonDisabled]}
    onPress={handleSubmit}
    disabled={submitting || !comments.trim() || rating === 0}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={
        submitting || !comments.trim() || rating === 0
          ? ['#6B7280', '#4B5563'] 
          : ['#10B981', '#059669']
      }
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.submitButtonGradient}
    >
      <View style={styles.submitButtonContent}>
        {submitting ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.submitButtonText}>Submitting...</Text>
          </>
        ) : (
          <>
            <Icon name="send" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </>
        )}
      </View>
    </LinearGradient>
  </TouchableOpacity>
  
  <Text style={styles.submitHint}>
    {submitting 
      ? 'Please wait while we save your feedback...' 
      : (!comments.trim() || rating === 0)
        ? 'Please provide rating and feedback to submit'
        : 'Your feedback helps us improve the experience'
    }
  </Text>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  ratingCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingIconContainer: {
    marginRight: 12,
  },
  ratingLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    marginHorizontal: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  starGradient: {
    padding: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  feedbackCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackIconContainer: {
    marginRight: 12,
  },
  feedbackLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  feedbackSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#334155',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  textInput: {
    fontSize: 16,
    color: '#F8FAFC',
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 16,
  },
  characterCount: {
    alignItems: 'flex-end',
  },
  characterCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomContainer: {
    alignItems: 'center',
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  submitHint: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});