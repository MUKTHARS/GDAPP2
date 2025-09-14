import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator,TouchableOpacity, Modal, ScrollView } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({ 
    text: '', 
    weight: '1.0', 
    levels: [] 
  });
  const [editingId, setEditingId] = useState(null);
  const [levelSelection, setLevelSelection] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const levels = [1, 2, 3]; // Assuming we have 3 GD levels

  useEffect(() => {
    fetchQuestions();
  }, []);

const fetchQuestions = async () => {
  try {
    setLoading(true);
    const response = await api.get('/admin/questions');
    
    // Handle both direct array and nested data responses
    let questionsData = response.data;
    if (response.data && !Array.isArray(response.data) && response.data.data) {
      questionsData = response.data.data;
    }
    
    if (!Array.isArray(questionsData)) {
      console.log('Unexpected response format, using empty array');
      questionsData = [];
    }
    
    // Ensure all questions have levels array
    const formattedQuestions = questionsData.map(q => ({
      ...q,
      levels: Array.isArray(q.levels) ? q.levels : []
    }));
    
    setQuestions(formattedQuestions);
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    setQuestions([]);
  } finally {
    setLoading(false);
  }
};


// const fetchQuestions = async () => {
//   try {
//     const response = await api.get('/admin/questions', {
//       headers: {
//         'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
//       }
//     });
    
//     if (response.data && Array.isArray(response.data)) {
//       setQuestions(response.data);
//     } else {
//       console.log('Unexpected response format, using empty array');
//       setQuestions([]);
//     }
//   } catch (error) {
//     console.error('Failed to fetch questions:', error);
//     // Fallback to empty array
//     setQuestions([]);
//   }
// };

  const toggleLevel = (level) => {
    if (newQuestion.levels.includes(level)) {
      setNewQuestion(prev => ({
        ...prev,
        levels: prev.levels.filter(l => l !== level)
      }));
    } else {
      setNewQuestion(prev => ({
        ...prev,
        levels: [...prev.levels, level]
      }));
    }
  };

 const handleSaveQuestion = async () => {
   console.log('Saving question:', {
    editingId,
    text: newQuestion.text,
    weight: newQuestion.weight,
    levels: newQuestion.levels
  });
  if (!newQuestion.text || newQuestion.levels.length === 0) {
    alert('Question text and at least one level are required');
    return;
  }

  const weight = parseFloat(newQuestion.weight);
  if (isNaN(weight) || weight <= 0) {
    alert('Weight must be a positive number');
    return;
  }

  setLoading(true);
  try {
    const questionData = {
      text: newQuestion.text,
      weight: weight,
      levels: newQuestion.levels
    };
 console.log('Sending data to server:', questionData);
    let response;
    if (editingId) {
      response = await api.put('/admin/questions', {
        id: editingId,
        ...questionData
      });
    } else {
      response = await api.post('/admin/questions', questionData);
    }
console.log('Server response:', response.data);
    if (response.data && response.data.status === 'success') {
      setNewQuestion({ text: '', weight: '1.0', levels: [] });
      setEditingId(null);
      await fetchQuestions();
    } else {
      throw new Error(response.data?.error || 'Failed to save question');
    }
  } catch (error) {
    console.error('Failed to save question:', error);
    alert('Failed to save question: ' + (error.response?.data?.error || error.message));
  } finally {
    setLoading(false);
  }
};

  const handleEditQuestion = (question) => {
    setNewQuestion({
      text: question.text,
      weight: String(question.weight),
      levels: question.levels || []
    });
    setEditingId(question.id);
  };

  const handleDeleteQuestion = async (id) => {
    try {
      await api.delete(`/admin/questions?id=${id}`);
      await fetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  return (
    <View style={styles.container}>
      {/* <HeaderWithMenu title="Question Bank" /> */}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Question' : 'Add New Question'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Question text"
              value={newQuestion.text}
              onChangeText={(text) => setNewQuestion({...newQuestion, text})}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Weight (e.g., 1.5)"
              keyboardType="numeric"
              value={newQuestion.weight}
              onChangeText={(weight) => setNewQuestion({...newQuestion, weight})}
            />
            
            <Text style={styles.sectionTitle}>Apply to Levels:</Text>
            <View style={styles.levelContainer}>
              {levels.map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    newQuestion.levels.includes(level) && styles.levelButtonSelected
                  ]}
                  onPress={() => toggleLevel(level)}
                >
                  <Text style={styles.levelButtonText}>Level {level}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewQuestion({ text: '', weight: '1.0', levels: [] });
                  setEditingId(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  handleSaveQuestion();
                  setModalVisible(false);
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {editingId ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Question</Text>
      </TouchableOpacity>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.questionCard}>
            <View style={styles.questionContent}>
              <Text style={styles.questionText}>{item.text}</Text>
              <View style={styles.questionMeta}>
                <Text style={styles.weightText}>Weight: {item.weight}</Text>
                <Text style={styles.levelsText}>
                  Levels: {item.levels?.join(', ') || 'All'}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                  handleEditQuestion(item);
                  setModalVisible(true);
                }}
              >
                <Text>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteQuestion(item.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  questionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightText: {
    color: '#666',
    fontSize: 14,
  },
  levelsText: {
    color: '#666',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: 'red',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  levelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  levelButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  levelButtonSelected: {
    backgroundColor: '#007AFF',
  },
  levelButtonText: {
    fontSize: 14,
    color: '#333',
  },
  levelButtonSelectedText: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});