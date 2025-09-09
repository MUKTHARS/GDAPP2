import React, { useState } from 'react';
import { View, Button, TextInput, } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function BulkSessions() {
  const [sessions, setSessions] = useState([{ 
    venue_id: '', 
    level: 1, 
    start_time: '' 
  }]);

  const handleSubmit = async () => {
    try {
      await api.post('/admin/sessions/bulk', { sessions });
      alert('Sessions created successfully');
    } catch (error) {
      alert('Failed to create sessions');
    }
  };

  return (
    <View>
     
      {sessions.map((session, index) => (
        <View key={index}>
          <TextInput
            placeholder="Venue ID"
            value={session.venue_id}
            onChangeText={(text) => {
              const updated = [...sessions];
              updated[index].venue_id = text;
              setSessions(updated);
            }}
          />
          <TextInput
            placeholder="Level"
            value={String(session.level)}
            onChangeText={(text) => {
              const updated = [...sessions];
              updated[index].level = parseInt(text) || 0;
              setSessions(updated);
            }}
          />
        </View>
      ))}
      <Button title="Add Another Session" onPress={() => 
        setSessions([...sessions, { venue_id: '', level: 1 }])
      } />
      <Button title="Submit All" onPress={handleSubmit} />
    </View>
  );
}