import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function StudentProgress() {
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchStudents();
  }, [filter]);

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/admin/students?filter=${filter}`);
      setStudents(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
        
      <View style={styles.filterContainer}>
        <Text 
          style={[styles.filter, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          All
        </Text>
        <Text 
          style={[styles.filter, filter === 'qualified' && styles.activeFilter]}
          onPress={() => setFilter('qualified')}
        >
          Qualified
        </Text>
      </View>

      <FlatList
        data={students}
        renderItem={({item}) => (
          <View style={styles.studentCard}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>Dept: {item.department}</Text>
            <Text>Level: {item.current_level}</Text>
            <Text>Attempts: {item.attempts}</Text>
            {item.qualified && <Text style={styles.qualified}>QUALIFIED</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  filterContainer: { flexDirection: 'row', marginBottom: 10 },
  filter: { marginRight: 15, padding: 5 },
  activeFilter: { fontWeight: 'bold', borderBottomWidth: 2 },
  studentCard: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 5
  },
  name: { fontWeight: 'bold' },
  qualified: { color: 'green', fontWeight: 'bold' }
});