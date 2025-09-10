import React, { useState, useEffect } from 'react';
import { View, Button, Alert, TextInput, ScrollView, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../services/api';

export default function SessionConfig() {
  const [level, setLevel] = useState(1);
  const [prepTime, setPrepTime] = useState('2');
  const [discussionTime, setDiscussionTime] = useState('2');
  const [surveyTime, setSurveyTime] = useState('1');
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(5); // Total minutes
  const [startTime, setStartTime] = useState(new Date());
  const [savedSessions, setSavedSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    fetchVenues();
    fetchSavedSessions();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await api.admin.getVenues();
      setVenues(response.data);
      if (response.data.length > 0) {
        setSelectedVenue(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    }
  };

  const fetchSavedSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await api.admin.getSessions();
      setSavedSessions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch saved sessions:', error);
      setSavedSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const calculateEndTime = (start, duration) => {
    const endTime = new Date(start);
    endTime.setMinutes(endTime.getMinutes() + duration);
    return endTime;
  };

  const handleSaveSession = async () => {
    setIsLoading(true);
    try {
      const endTime = calculateEndTime(startTime, sessionDuration);
      
      // Create agenda in the exact format needed
      const agenda = {
        prep_time: parseInt(prepTime) || 2,
        discussion: parseInt(discussionTime) || 20,
        survey: parseInt(surveyTime) || 1
      };

      const sessionData = {
        venue_id: selectedVenue,
        level: level,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        agenda: agenda,
        survey_weights: {
          participation: 0.4,
          knowledge: 0.3,
          communication: 0.3
        }
      };

      const response = await api.admin.createBulkSessions({
        sessions: [sessionData]
      });

      if (response.status === 200) {
        Alert.alert('Success', 'Session created successfully');
        fetchSavedSessions();
        // Reset form to default values
        setPrepTime('2');
        setDiscussionTime('20');
        setSurveyTime('1');
        setSessionDuration(5);
        setStartTime(new Date());
      } else {
        throw new Error(response.data?.error || 'Failed to create session');
      }
    } catch (error) {
      console.error("Session creation error:", error);
      Alert.alert('Error', error.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const getVenueName = (venueId) => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? venue.name : 'Unknown Venue';
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={styles.sectionTitle}>Session Configuration</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Venue</Text>
        <Picker
          selectedValue={selectedVenue}
          onValueChange={setSelectedVenue}
          style={styles.picker}
        >
          {venues.map(venue => (
            <Picker.Item 
              key={venue.id} 
              label={venue.name} 
              value={venue.id} 
            />
          ))}
        </Picker>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Level</Text>
        <Picker
          selectedValue={level}
          onValueChange={setLevel}
          style={styles.picker}
        >
          <Picker.Item label="Level 1" value={1} />
          <Picker.Item label="Level 2" value={2} />
          <Picker.Item label="Level 3" value={3} />
          <Picker.Item label="Level 4" value={4} />
          <Picker.Item label="Level 5" value={5} />
        </Picker>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Preparation Time (minutes)</Text>
        <TextInput
          value={prepTime}
          onChangeText={setPrepTime}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g., 2"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Discussion Time (minutes)</Text>
        <TextInput
          value={discussionTime}
          onChangeText={setDiscussionTime}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g., 2"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Survey Time (minutes)</Text>
        <TextInput
          value={surveyTime}
          onChangeText={setSurveyTime}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g., 1"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Session Duration (minutes)</Text>
        <TextInput
          value={sessionDuration.toString()}
          onChangeText={(text) => setSessionDuration(parseInt(text) || 5)}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g., 5"
        />
        <Text style={styles.helperText}>
          Total: {parseInt(prepTime || 0) + parseInt(discussionTime || 0) + parseInt(surveyTime || 0)} minutes
        </Text>
      </View>
      
      <Button
        title={isLoading ? "Saving..." : "Save Session Configuration"}
        onPress={handleSaveSession}
        disabled={isLoading || !selectedVenue}
        color="#4CAF50"
      />

      {/* Display Saved Sessions */}
      <View style={styles.savedSectionsContainer}>
        <Text style={styles.sectionTitle}>Saved Session Configurations</Text>
        
        {loadingSessions ? (
          <Text>Loading saved sessions...</Text>
        ) : savedSessions.length === 0 ? (
          <Text style={styles.noSessionsText}>No saved sessions found</Text>
        ) : (
          savedSessions.map((session, index) => (
            <View key={session.id || index} style={styles.sessionCard}>
              <Text style={styles.venueName}>
                {getVenueName(session.venue_id)}
              </Text>
              <Text>Level: {session.level}</Text>
              <Text>Start: {formatTime(session.start_time)}</Text>
              <Text>End: {formatTime(session.end_time)}</Text>
              {session.agenda && (
                <>
                  <Text>Prep: {session.agenda.prep_time || session.agenda.prep_time || 0} min</Text>
                  <Text>Discussion: {session.agenda.discussion || session.agenda.discussion || 0} min</Text>
                  <Text>Survey: {session.agenda.survey || session.agenda.survey || 0} min</Text>
                </>
              )}
              <Text style={styles.sessionStatus}>
                Status: {session.status || 'pending'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  savedSectionsContainer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sessionCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  venueName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sessionStatus: {
    marginTop: 5,
    fontStyle: 'italic',
    color: '#666',
  },
  noSessionsText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
});

// // frontend/src/admin/screens/SessionConfig.js
// import React, { useState, useEffect } from 'react';
// import { View, Button, Alert, TextInput } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import AgendaEditor from '../components/AgendaEditor';
// import api from '../services/api';

// export default function SessionConfig() {
//   const [level, setLevel] = useState(1);
//   const [agenda, setAgenda] = useState({
//     prep_time: 0,
//     discussion: 0,
//     survey: 0
//   });
//   const [venues, setVenues] = useState([]);
//   const [selectedVenue, setSelectedVenue] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [sessionDuration, setSessionDuration] = useState(60); // Default 60 minutes
//   const [startTime, setStartTime] = useState(new Date());

//   useEffect(() => {
//     const fetchVenues = async () => {
//       try {
//         const response = await api.admin.getVenues();
//         setVenues(response.data);
//         if (response.data.length > 0) {
//           setSelectedVenue(response.data[0].id);
//         }
//       } catch (error) {
//         console.error('Failed to fetch venues:', error);
//       }
//     };
//     fetchVenues();
//   }, []);

//   const calculateEndTime = (start, duration) => {
//     const endTime = new Date(start);
//     endTime.setMinutes(endTime.getMinutes() + duration);
//     return endTime;
//   };

//   const handleSaveSession = async () => {
//     setIsLoading(true);
//     try {
//       const endTime = calculateEndTime(startTime, sessionDuration);
      
//       const sessionData = {
//         venue_id: selectedVenue,
//         level: level,
//         start_time: startTime.toISOString(),
//         end_time: endTime.toISOString(),
//         agenda: agenda,
//         survey_weights: {
//           participation: 0.4,
//           knowledge: 0.3,
//           communication: 0.3
//         }
//       };

//       const response = await api.admin.createBulkSessions({
//         sessions: [sessionData]
//       });

//       if (response.status === 200) {
//         Alert.alert('Success', 'Session created successfully');
//       } else {
//         throw new Error(response.data?.error || 'Failed to create session');
//       }
//     } catch (error) {
//       console.error("Session creation error:", error);
//       Alert.alert('Error', error.message || 'Failed to create session');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Picker
//         selectedValue={selectedVenue}
//         onValueChange={setSelectedVenue}
//         style={{ marginBottom: 20 }}
//       >
//         {venues.map(venue => (
//           <Picker.Item 
//             key={venue.id} 
//             label={venue.name} 
//             value={venue.id} 
//           />
//         ))}
//       </Picker>
      
//       <Picker
//         selectedValue={level}
//         onValueChange={setLevel}
//         style={{ marginBottom: 20 }}
//       >
//         <Picker.Item label="Level 1" value={1} />
//         <Picker.Item label="Level 2" value={2} />
//       </Picker>
      
//       <TextInput
//         placeholder="Session Duration (minutes)"
//         value={sessionDuration.toString()}
//         onChangeText={(text) => setSessionDuration(parseInt(text) || 0)}
//         keyboardType="numeric"
//         style={{ marginBottom: 20 }}
//       />
      
//       <AgendaEditor agenda={agenda} onChange={setAgenda} />
      
//       <Button
//         title={isLoading ? "Saving..." : "Save Session"}
//         onPress={handleSaveSession}
//         disabled={isLoading || !selectedVenue}
//       />
//     </View>
//   );
// }