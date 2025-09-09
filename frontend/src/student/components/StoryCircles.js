import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const StoryCircles = () => {
  const [selectedStory, setSelectedStory] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const stories = [
    {
      id: 1,
      title: 'Guidelines',
      icon: 'rule',
      gradient: ['#667eea', '#764ba2'],
      content: {
        title: 'Booking Guidelines',
        description: 'Important rules and guidelines for session booking',
        details: [
          '• Only one active booking per student',
          '• Book sessions for your current level only',
          '• Arrive 5 minutes before session starts',
          '• Cancellation requires typing "cancel"',
          '• Late arrivals may forfeit their slot'
        ]
      }
    },
    {
      id: 2,
      title: 'Schedule',
      icon: 'schedule',
      gradient: ['#f093fb', '#f5576c'],
      content: {
        title: 'Session Schedule',
        description: 'Timing and availability information',
        details: [
          '• Morning sessions: 9:00 AM - 12:00 PM',
          '• Afternoon sessions: 1:00 PM - 5:00 PM',
          '• Evening sessions: 6:00 PM - 8:00 PM',
          '• Weekend sessions available',
          '• Check real-time availability'
        ]
      }
    },
    {
      id: 3,
      title: 'Levels',
      icon: 'trending-up',
      gradient: ['#4facfe', '#00f2fe'],
      content: {
        title: 'Level Information',
        description: 'Understanding session levels',
        details: [
          '• Level 1: Beginner discussions',
          '• Level 2: Intermediate topics',
          '• Level 3: Advanced conversations',
          '• Level 4: Advanced 2 conversations',
          '• Level 5: Advanced 3 conversations',
          '• Match your current academic level',
          '• Progress through levels systematically'
        ]
      }
    },
    {
      id: 4,
      title: 'Tips',
      icon: 'lightbulb',
      gradient: ['#fa709a', '#fee140'],
      content: {
        title: 'Booking Tips',
        description: 'Pro tips for successful booking',
        details: [
          '• Book early for popular time slots',
          '• Check availability frequently',
          '• Use QR scanner for quick access',
          '• Prepare discussion topics in advance',
          '• Join sessions with enthusiasm'
        ]
      }
    },
    {
      id: 5,
      title: 'Support',
      icon: 'help',
      gradient: ['#a8edea', '#fed6e3'],
      content: {
        title: 'Need Help?',
        description: 'Get assistance with booking',
        details: [
          '• Contact session coordinators',
          '• Check FAQ section',
          '• Report technical issues',
          '• Request special accommodations',
          '• Feedback and suggestions welcome'
        ]
      }
    }
  ];

  const openStory = (story) => {
    setSelectedStory(story);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedStory(null);
  };

  const StoryCircle = ({ story }) => (
    <TouchableOpacity
      style={styles.storyContainer}
      onPress={() => openStory(story)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={story.gradient}
        style={styles.storyCircle}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      >
        <View style={styles.storyInnerCircle}>
          <Icon name={story.icon} size={24} color="#FFFFFF" />
        </View>
      </LinearGradient>
      <Text style={styles.storyTitle}>{story.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {stories.map(story => (
          <StoryCircle key={story.id} story={story} />
        ))}
      </ScrollView>

      {/* Story Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedStory && (
              <>
                <View style={styles.modalHeader}>
                  <LinearGradient
                    colors={selectedStory.gradient}
                    style={styles.modalIconContainer}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                  >
                    <Icon name={selectedStory.icon} size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>{selectedStory.content.title}</Text>
                    <Text style={styles.modalDescription}>{selectedStory.content.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeModal}
                  >
                    <Icon name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalContent}>
                  {selectedStory.content.details.map((detail, index) => (
                    <View key={index} style={styles.detailItem}>
                      <Text style={styles.detailText}>{detail}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scrollContainer: {
    paddingRight: 20,
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  storyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a0f1bff',
  },
  storyTitle: {
    marginTop: 8,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 70,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  modalContent: {
    padding: 20,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
  },
});

export default StoryCircles;