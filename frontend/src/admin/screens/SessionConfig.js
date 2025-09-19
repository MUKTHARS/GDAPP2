// SessionConfig.js
import React, { useState, useEffect } from 'react';
import { View, Button, Alert, TextInput, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../services/api';

export default function SessionConfig() {
  const [level, setLevel] = useState(1);
  const [prepTime, setPrepTime] = useState('2');
  const [discussionTime, setDiscussionTime] = useState('20');
  const [surveyTime, setSurveyTime] = useState('5');
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [startTime, setStartTime] = useState(new Date());
  const [savedSessions, setSavedSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(true);

  useEffect(() => {
    fetchVenues();
    fetchSavedSessions();
  }, []);

  // Calculate total duration whenever times change
  useEffect(() => {
    const total = parseInt(prepTime || 0) + parseInt(discussionTime || 0) + parseInt(surveyTime || 0);
    setSessionDuration(total);
  }, [prepTime, discussionTime, surveyTime]);

  const fetchVenues = async () => {
    try {
      setLoadingVenues(true);
      const response = await api.admin.getVenues();
      
      // Handle different response formats
      let venuesData = [];
      if (response.data && Array.isArray(response.data)) {
        venuesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        venuesData = response.data.data;
      } else if (Array.isArray(response)) {
        venuesData = response;
      }
      
      setVenues(venuesData);
      
      if (venuesData.length > 0) {
        setSelectedVenue(venuesData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
      setVenues([]);
    } finally {
      setLoadingVenues(false);
    }
  };

  const fetchSavedSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await api.admin.getSessions();
      
      // Handle different response formats
      let sessionsData = [];
      if (response.data && Array.isArray(response.data)) {
        sessionsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        sessionsData = response.data.data;
      } else if (Array.isArray(response)) {
        sessionsData = response;
      }
      
      setSavedSessions(sessionsData);
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
    if (!selectedVenue) {
      Alert.alert('Error', 'Please select a venue');
      return;
    }

    setIsLoading(true);
    try {
      const endTime = calculateEndTime(startTime, sessionDuration);
      
      // Create agenda in the exact format needed by backend
      const agenda = {
        prep_time: parseInt(prepTime) || 2,
        discussion: parseInt(discussionTime) || 20, // Note: backend expects "discussion" not "discussion_time"
        survey: parseInt(surveyTime) || 5
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

      console.log('Sending session data:', sessionData);

      const response = await api.admin.createBulkSessions({
        sessions: [sessionData]
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Session created successfully');
        fetchSavedSessions();
        // Reset form to default values
        setPrepTime('2');
        setDiscussionTime('20');
        setSurveyTime('5');
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
    return venue ? `${venue.name} (Level ${venue.level})` : 'Unknown Venue';
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const date = new Date(timeString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const parseAgendaTime = (agenda, key) => {
    if (!agenda) return 0;
    
    // Handle different key formats
    if (agenda[key] !== undefined) return agenda[key];
    if (agenda[key.toLowerCase()] !== undefined) return agenda[key.toLowerCase()];
    
    // Fallback to alternative keys
    if (key === 'discussion' && agenda.discussion_time !== undefined) {
      return agenda.discussion_time;
    }
    
    return 0;
  };

  if (loadingVenues) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading venues...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Session Configuration</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Venue</Text>
        {venues.length === 0 ? (
          <Text style={styles.errorText}>No venues available. Please create venues first.</Text>
        ) : (
          <Picker
            selectedValue={selectedVenue}
            onValueChange={setSelectedVenue}
            style={styles.picker}
          >
            {venues.map(venue => (
              <Picker.Item 
                key={venue.id} 
                label={`${venue.name} (Level ${venue.level})`} 
                value={venue.id} 
              />
            ))}
          </Picker>
        )}
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
          placeholder="e.g., 20"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Survey Time (minutes)</Text>
        <TextInput
          value={surveyTime}
          onChangeText={setSurveyTime}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g., 5"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Session Duration</Text>
        <Text style={styles.totalDuration}>
          {sessionDuration} minutes (Prep: {prepTime} + Discussion: {discussionTime} + Survey: {surveyTime})
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? "Saving..." : "Save Session Configuration"}
          onPress={handleSaveSession}
          disabled={isLoading || !selectedVenue || venues.length === 0}
          color="#4CAF50"
        />
      </View>

      {/* Display Saved Sessions */}
      <View style={styles.savedSectionsContainer}>
        <Text style={styles.sectionTitle}>Saved Session Configurations</Text>
        
        {loadingSessions ? (
          <ActivityIndicator size="small" color="#4CAF50" />
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
                  <Text>Prep: {parseAgendaTime(session.agenda, 'prep_time')} min</Text>
                  <Text>Discussion: {parseAgendaTime(session.agenda, 'discussion')} min</Text>
                  <Text>Survey: {parseAgendaTime(session.agenda, 'survey')} min</Text>
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
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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
  totalDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    padding: 10,
    backgroundColor: '#f0f9f0',
    borderRadius: 5,
  },
  buttonContainer: {
    marginBottom: 30,
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
    color: '#333',
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
    padding: 20,
  },
  errorText: {
    color: '#f44336',
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
});


// import React, { useState, useEffect } from 'react';
// import { View, Button, Alert, TextInput, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import api from '../services/api';

// export default function SessionConfig() {
//   const [level, setLevel] = useState(1);
//   const [prepTime, setPrepTime] = useState('2');
//   const [discussionTime, setDiscussionTime] = useState('20');
//   const [surveyTime, setSurveyTime] = useState('5');
//   const [venues, setVenues] = useState([]);
//   const [selectedVenue, setSelectedVenue] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [sessionDuration, setSessionDuration] = useState(0);
//   const [startTime, setStartTime] = useState(new Date());
//   const [savedSessions, setSavedSessions] = useState([]);
//   const [loadingSessions, setLoadingSessions] = useState(false);
//   const [loadingVenues, setLoadingVenues] = useState(true);

//   useEffect(() => {
//     fetchVenues();
//     fetchSavedSessions();
//   }, []);

//   // Calculate total duration whenever times change
//   useEffect(() => {
//     const total = parseInt(prepTime || 0) + parseInt(discussionTime || 0) + parseInt(surveyTime || 0);
//     setSessionDuration(total);
//   }, [prepTime, discussionTime, surveyTime]);

//   const fetchVenues = async () => {
//     try {
//       setLoadingVenues(true);
//       const response = await api.admin.getVenues();
//       if (response.data && Array.isArray(response.data)) {
//         setVenues(response.data);
//         if (response.data.length > 0) {
//           setSelectedVenue(response.data[0].id);
//         }
//       } else {
//         setVenues([]);
//         console.error('Invalid venues response:', response.data);
//       }
//     } catch (error) {
//       console.error('Failed to fetch venues:', error);
//       setVenues([]);
//     } finally {
//       setLoadingVenues(false);
//     }
//   };

//   const fetchSavedSessions = async () => {
//     try {
//       setLoadingSessions(true);
//       const response = await api.admin.getSessions();
//       setSavedSessions(response.data || []);
//     } catch (error) {
//       console.error('Failed to fetch saved sessions:', error);
//       setSavedSessions([]);
//     } finally {
//       setLoadingSessions(false);
//     }
//   };

//   const calculateEndTime = (start, duration) => {
//     const endTime = new Date(start);
//     endTime.setMinutes(endTime.getMinutes() + duration);
//     return endTime;
//   };

//   const handleSaveSession = async () => {
//     if (!selectedVenue) {
//       Alert.alert('Error', 'Please select a venue');
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const endTime = calculateEndTime(startTime, sessionDuration);
      
//       // Create agenda in the exact format needed by backend
//       const agenda = {
//         prep_time: parseInt(prepTime) || 2,
//         discussion_time: parseInt(discussionTime) || 20,
//         survey_time: parseInt(surveyTime) || 5
//       };

//       const sessionData = {
//         venue_id: selectedVenue,
//         level: level,
//         start_time: startTime,
//         end_time: endTime,
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

//       if (response.status === 200 || response.status === 201) {
//         Alert.alert('Success', 'Session created successfully');
//         fetchSavedSessions();
//         // Reset form to default values
//         setPrepTime('2');
//         setDiscussionTime('20');
//         setSurveyTime('5');
//         setStartTime(new Date());
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

//   const getVenueName = (venueId) => {
//     const venue = venues.find(v => v.id === venueId);
//     return venue ? venue.name : 'Unknown Venue';
//   };

//   const formatTime = (timeString) => {
//     if (!timeString) return 'N/A';
//     try {
//       const date = new Date(timeString);
//       return date.toLocaleString();
//     } catch (error) {
//       return 'Invalid Date';
//     }
//   };

//   const parseAgendaTime = (agenda, key) => {
//     if (!agenda) return 0;
//     return agenda[key] || agenda[key.toLowerCase()] || 0;
//   };

//   if (loadingVenues) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#4CAF50" />
//         <Text>Loading venues...</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView style={{ padding: 20 }}>
//       <Text style={styles.sectionTitle}>Session Configuration</Text>
      
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Venue</Text>
//         {venues.length === 0 ? (
//           <Text style={styles.errorText}>No venues available. Please create venues first.</Text>
//         ) : (
//           <Picker
//             selectedValue={selectedVenue}
//             onValueChange={setSelectedVenue}
//             style={styles.picker}
//           >
//             {venues.map(venue => (
//               <Picker.Item 
//                 key={venue.id} 
//                 label={`${venue.name} (Level ${venue.level})`} 
//                 value={venue.id} 
//               />
//             ))}
//           </Picker>
//         )}
//       </View>
      
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Level</Text>
//         <Picker
//           selectedValue={level}
//           onValueChange={setLevel}
//           style={styles.picker}
//         >
//           <Picker.Item label="Level 1" value={1} />
//           <Picker.Item label="Level 2" value={2} />
//           <Picker.Item label="Level 3" value={3} />
//           <Picker.Item label="Level 4" value={4} />
//           <Picker.Item label="Level 5" value={5} />
//         </Picker>
//       </View>
      
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Preparation Time (minutes)</Text>
//         <TextInput
//           value={prepTime}
//           onChangeText={setPrepTime}
//           keyboardType="numeric"
//           style={styles.input}
//           placeholder="e.g., 2"
//         />
//       </View>
      
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Discussion Time (minutes)</Text>
//         <TextInput
//           value={discussionTime}
//           onChangeText={setDiscussionTime}
//           keyboardType="numeric"
//           style={styles.input}
//           placeholder="e.g., 20"
//         />
//       </View>
      
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Survey Time (minutes)</Text>
//         <TextInput
//           value={surveyTime}
//           onChangeText={setSurveyTime}
//           keyboardType="numeric"
//           style={styles.input}
//           placeholder="e.g., 5"
//         />
//       </View>
      
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Total Session Duration</Text>
//         <Text style={styles.totalDuration}>
//           {sessionDuration} minutes (Prep: {prepTime} + Discussion: {discussionTime} + Survey: {surveyTime})
//         </Text>
//       </View>
      
//       <View style={styles.buttonContainer}>
//         <Button
//           title={isLoading ? "Saving..." : "Save Session Configuration"}
//           onPress={handleSaveSession}
//           disabled={isLoading || !selectedVenue || venues.length === 0}
//           color="#4CAF50"
//         />
//       </View>

//       {/* Display Saved Sessions */}
//       <View style={styles.savedSectionsContainer}>
//         <Text style={styles.sectionTitle}>Saved Session Configurations</Text>
        
//         {loadingSessions ? (
//           <ActivityIndicator size="small" color="#4CAF50" />
//         ) : savedSessions.length === 0 ? (
//           <Text style={styles.noSessionsText}>No saved sessions found</Text>
//         ) : (
//           savedSessions.map((session, index) => (
//             <View key={session.id || index} style={styles.sessionCard}>
//               <Text style={styles.venueName}>
//                 {getVenueName(session.venue_id)}
//               </Text>
//               <Text>Level: {session.level}</Text>
//               <Text>Start: {formatTime(session.start_time)}</Text>
//               <Text>End: {formatTime(session.end_time)}</Text>
//               {session.agenda && (
//                 <>
//                   <Text>Prep: {parseAgendaTime(session.agenda, 'prep_time')} min</Text>
//                   <Text>Discussion: {parseAgendaTime(session.agenda, 'discussion')} min</Text>
//                   <Text>Survey: {parseAgendaTime(session.agenda, 'survey')} min</Text>
//                 </>
//               )}
//               <Text style={styles.sessionStatus}>
//                 Status: {session.status || 'pending'}
//               </Text>
//             </View>
//           ))
//         )}
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 5,
//     color: '#555',
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     padding: 12,
//     borderRadius: 5,
//     fontSize: 16,
//   },
//   picker: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 5,
//   },
//   totalDuration: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#4CAF50',
//     padding: 10,
//     backgroundColor: '#f0f9f0',
//     borderRadius: 5,
//   },
//   buttonContainer: {
//     marginBottom: 30,
//   },
//   savedSectionsContainer: {
//     marginTop: 30,
//     paddingTop: 20,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//   },
//   sessionCard: {
//     backgroundColor: '#f9f9f9',
//     padding: 15,
//     borderRadius: 5,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   venueName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 5,
//     color: '#333',
//   },
//   sessionStatus: {
//     marginTop: 5,
//     fontStyle: 'italic',
//     color: '#666',
//   },
//   noSessionsText: {
//     textAlign: 'center',
//     color: '#999',
//     fontStyle: 'italic',
//     padding: 20,
//   },
//   errorText: {
//     color: '#f44336',
//     padding: 10,
//     backgroundColor: '#ffebee',
//     borderRadius: 5,
//   },
// });