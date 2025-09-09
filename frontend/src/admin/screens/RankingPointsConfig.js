import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  FlatList,
  Modal,
  Alert 
} from 'react-native';
import api from '../services/api';

export default function RankingPointsConfig() {
  const [configs, setConfigs] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    first_place_points: '4.0',
    second_place_points: '3.0', 
    third_place_points: '2.0',
    level: '1'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getRankingPoints();
      setConfigs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      setMessage('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      first_place_points: config.first_place_points.toString(),
      second_place_points: config.second_place_points.toString(),
      third_place_points: config.third_place_points.toString(),
      level: config.level.toString()
    });
    setModalVisible(true);
  };

  const handleCreateNew = () => {
    setEditingConfig(null);
    setFormData({
      first_place_points: '4.0',
      second_place_points: '3.0', 
      third_place_points: '2.0',
      level: '1'
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      const pointsData = {
        first_place_points: parseFloat(formData.first_place_points),
        second_place_points: parseFloat(formData.second_place_points),
        third_place_points: parseFloat(formData.third_place_points),
        level: parseInt(formData.level)
      };

      if (editingConfig) {
        pointsData.id = editingConfig.id;
      }

      const response = await api.admin.updateRankingPoints(pointsData);
      
      if (response.data.status === 'success') {
        setMessage('Configuration saved successfully!');
        setModalVisible(false);
        fetchConfigs();
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (config) => {
    Alert.alert(
      "Delete Configuration",
      `Are you sure you want to delete the points configuration for Level ${config.level}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.admin.deleteRankingPoints(config.id);
              setMessage('Configuration deleted successfully!');
              fetchConfigs();
            } catch (error) {
              setMessage(error.response?.data?.error || 'Failed to delete configuration');
            }
          }
        }
      ]
    );
  };

  const handleToggle = async (config) => {
    try {
      await api.admin.toggleRankingPoints(config.id);
      setMessage(`Configuration ${config.is_active ? 'deactivated' : 'activated'} successfully!`);
      fetchConfigs();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update configuration');
    }
  };

  const validatePoints = () => {
    const first = parseFloat(formData.first_place_points);
    const second = parseFloat(formData.second_place_points);
    const third = parseFloat(formData.third_place_points);

    if (first <= second || second <= third) {
      return "Points must be in descending order (1st > 2nd > 3rd)";
    }
    if (first <= 0 || second <= 0 || third <= 0) {
      return "Points must be positive values";
    }
    return null;
  };

  const validationError = validatePoints();

  const renderConfigItem = ({ item }) => (
    <View style={styles.configCard}>
      <View style={styles.configInfo}>
        <Text style={styles.configLevel}>Level {item.level}</Text>
        <Text style={styles.configPoints}>
          1st: {item.first_place_points} pts | 2nd: {item.second_place_points} pts | 3rd: {item.third_place_points} pts
        </Text>
        <Text style={item.is_active ? styles.activeStatus : styles.inactiveStatus}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <View style={styles.configActions}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => handleToggle(item)}
        >
          <Text style={styles.toggleButtonText}>
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ranking Points Configuration</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateNew}>
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {message && (
        <Text style={message.includes('success') ? styles.successText : styles.errorText}>
          {message}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={configs}
          keyExtractor={(item) => item.id}
          renderItem={renderConfigItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No configurations found. Add a new one to get started.</Text>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingConfig ? 'Edit Configuration' : 'Add New Configuration'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Level</Text>
              <TextInput
                style={styles.input}
                value={formData.level}
                onChangeText={(text) => setFormData({...formData, level: text})}
                keyboardType="numeric"
                placeholder="Enter level"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>1st Place Points</Text>
              <TextInput
                style={styles.input}
                value={formData.first_place_points}
                onChangeText={(text) => setFormData({...formData, first_place_points: text})}
                keyboardType="numeric"
                placeholder="Points for 1st place"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>2nd Place Points</Text>
              <TextInput
                style={styles.input}
                value={formData.second_place_points}
                onChangeText={(text) => setFormData({...formData, second_place_points: text})}
                keyboardType="numeric"
                placeholder="Points for 2nd place"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>3rd Place Points</Text>
              <TextInput
                style={styles.input}
                value={formData.third_place_points}
                onChangeText={(text) => setFormData({...formData, third_place_points: text})}
                keyboardType="numeric"
                placeholder="Points for 3rd place"
              />
            </View>

            {validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, validationError && styles.disabledButton]}
                onPress={handleSave}
                disabled={!!validationError || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  configCard: {
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
  configInfo: {
    flex: 1,
  },
  configLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  configPoints: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activeStatus: {
    color: 'green',
    fontSize: 12,
  },
  inactiveStatus: {
    color: 'red',
    fontSize: 12,
  },
  configActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 6,
    marginRight: 8,
    backgroundColor: '#FF9500',
    borderRadius: 4,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
  },
  editButton: {
    padding: 6,
    marginRight: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    color: 'green',
    textAlign: 'center',
    marginBottom: 10,
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
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});