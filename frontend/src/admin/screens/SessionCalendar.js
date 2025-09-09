import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
// import CalendarPicker from 'react-native-calendar-picker';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function SessionCalendar() {
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchSessions();
  }, [selectedDate]);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/admin/calendar');
      setSessions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const onDateChange = (date) => {
    setSelectedDate(new Date(date));
  };

  return (
    <View style={styles.container}>
        
      <CalendarPicker
        onDateChange={onDateChange}
        selectedStartDate={selectedDate}
        selectedDayColor="#2e86de"
        selectedDayTextColor="#FFFFFF"
        todayBackgroundColor="#f0f0f0"
        width={350}
      />
      
      <FlatList
        data={sessions.filter(session => {
          const sessionDate = new Date(session.start_time).toDateString();
          return sessionDate === selectedDate.toDateString();
        })}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.sessionCard}>
            <Text>{item.venue} (Level {item.level})</Text>
            <Text>{new Date(item.start_time).toLocaleTimeString()}</Text>
            <Text style={styles[item.status]}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.noSessions}>No sessions scheduled for this date</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 10,
    alignItems: 'left'
  },
  sessionCard: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
    width: '100%'
  },
  pending: { color: 'orange' },
  active: { color: 'green' },
  completed: { color: 'blue' },
  noSessions: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666'
  }
});