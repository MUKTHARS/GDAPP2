// C:\xampp\htdocs\GDAPPC\frontend\src\admin\screens\TopicManager.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  FlatList, 
  StyleSheet, 
  Alert,
  TouchableOpacity,
  Modal,

  ScrollView 
} from 'react-native';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';

export default function TopicManager({ navigation }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [formData, setFormData] = useState({
    level: '1',
    topic_text: '',
    prep_materials: {
      key_points: '',
      references: '',
      discussion_angles: ''
    }
  });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/topics');
      setTopics(response.data || []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.topic_text.trim()) {
        Alert.alert('Error', 'Topic text is required');
        return;
      }

      if (editingTopic) {
        await api.put('/admin/topics', {
          ...formData,
          id: editingTopic.id,
          level: parseInt(formData.level)
        });
        Alert.alert('Success', 'Topic updated successfully');
      } else {
        await api.post('/admin/topics', {
          ...formData,
          level: parseInt(formData.level)
        });
        Alert.alert('Success', 'Topic created successfully');
      }

      setModalVisible(false);
      setEditingTopic(null);
      setFormData({
        level: '1',
        topic_text: '',
        prep_materials: {
          key_points: '',
          references: '',
          discussion_angles: ''
        }
      });
      fetchTopics();
    } catch (error) {
      console.error('Failed to save topic:', error);
      Alert.alert('Error', 'Failed to save topic');
    }
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setFormData({
      level: topic.level.toString(),
      topic_text: topic.topic_text,
      prep_materials: topic.prep_materials || {
        key_points: '',
        references: '',
        discussion_angles: ''
      }
    });
    setModalVisible(true);
  };

  const handleDelete = async (topicId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this topic?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/admin/topics', { params: { id: topicId } });
              Alert.alert('Success', 'Topic deleted successfully');
              fetchTopics();
            } catch (error) {
              console.error('Failed to delete topic:', error);
              Alert.alert('Error', 'Failed to delete topic');
            }
          }
        }
      ]
    );
  };

  const renderTopicItem = ({ item }) => (
    <View style={styles.topicCard}>
      <View style={styles.topicHeader}>
        <Text style={styles.topicLevel}>Level {item.level}</Text>
        <View style={styles.topicActions}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
            <Icon name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
            <Icon name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.topicText}>{item.topic_text}</Text>
      {item.prep_materials && (
        <View style={styles.prepMaterials}>
          <Text style={styles.prepTitle}>Preparation Materials:</Text>
          {item.prep_materials.key_points && (
            <Text style={styles.prepText}>• {item.prep_materials.key_points}</Text>
          )}
          {item.prep_materials.references && (
            <Text style={styles.prepText}>• References: {item.prep_materials.references}</Text>
          )}
          {item.prep_materials.discussion_angles && (
            <Text style={styles.prepText}>• Angles: {item.prep_materials.discussion_angles}</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GD Topics Manager</Text>
        <Button
          title="Add New Topic"
          onPress={() => {
            setEditingTopic(null);
            setFormData({
              level: '1',
              topic_text: '',
              prep_materials: {
                key_points: '',
                references: '',
                discussion_angles: ''
              }
            });
            setModalVisible(true);
          }}
        />
      </View>

      {loading ? (
        <Text>Loading topics...</Text>
      ) : topics.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="topic" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No topics found</Text>
          <Text style={styles.emptySubtext}>Add your first GD topic to get started</Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={item => item.id}
          renderItem={renderTopicItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTopic ? 'Edit Topic' : 'Add New Topic'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Level</Text>
            <Picker
              selectedValue={formData.level}
              onValueChange={(value) => setFormData({ ...formData, level: value })}
              style={styles.picker}
            >
              <Picker.Item label="Level 1" value="1" />
              <Picker.Item label="Level 2" value="2" />
              <Picker.Item label="Level 3" value="3" />
              <Picker.Item label="Level 4" value="4" />
              <Picker.Item label="Level 5" value="5" />
            </Picker>

            <Text style={styles.label}>Topic Text</Text>
            <TextInput
              style={styles.input}
              value={formData.topic_text}
              onChangeText={(text) => setFormData({ ...formData, topic_text: text })}
              placeholder="Enter GD topic"
              multiline
            />

            <Text style={styles.label}>Key Points (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.prep_materials.key_points}
              onChangeText={(text) => setFormData({
                ...formData,
                prep_materials: { ...formData.prep_materials, key_points: text }
              })}
              placeholder="Key discussion points"
              multiline
            />

            <Text style={styles.label}>References (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.prep_materials.references}
              onChangeText={(text) => setFormData({
                ...formData,
                prep_materials: { ...formData.prep_materials, references: text }
              })}
              placeholder="Reference materials"
              multiline
            />

            <Text style={styles.label}>Discussion Angles (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.prep_materials.discussion_angles}
              onChangeText={(text) => setFormData({
                ...formData,
                prep_materials: { ...formData.prep_materials, discussion_angles: text }
              })}
              placeholder="Different angles for discussion"
              multiline
            />

            <Button
              title={editingTopic ? "Update Topic" : "Create Topic"}
              onPress={handleSubmit}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  topicCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicLevel: {
    fontWeight: 'bold',
    color: '#495057',
  },
  topicActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 10,
    padding: 5,
  },
  topicText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#212529',
  },
  prepMaterials: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 5,
  },
  prepTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#495057',
  },
  prepText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 40,
  },
  picker: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
  },
});