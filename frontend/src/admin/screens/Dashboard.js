import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, Modal, Animated, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';

export default function Dashboard({ navigation }) {
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [venues, setVenues] = useState([]);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueName, setVenueName] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [expiryTime, setExpiryTime] = useState('');
  const isFocused = useIsFocused();
  const [venueLevel, setVenueLevel] = useState('1');
  const menuItems = [
    { title: 'Dashboard', screen: 'Dashboard' },
    { title: 'Venue Management', screen: 'VenueSetup' },
    { title: 'Session Config', screen: 'SessionConfig' },
    { title: 'Session Rules', screen: 'SessionRules' },
     { name: 'TopParticipants', title: 'Top Performers', icon: 'rule' },
    { title: 'Session Calendar', screen: 'SessionCalendar' },
    { title: 'Student Progress', screen: 'StudentProgress' },
    { title: 'Question Bank', screen: 'QuestionBank' },
    { title: 'Analytics', screen: 'Analytics' },
    { title: 'Bulk Sesison', screen: 'Bulk Session' },
  ];
const parseTimeString = (timeStr) => {
  // Example: "11:30 AM" or "2:45 PM"
  const [time, period] = timeStr.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  
  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
};
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await api.get('/admin/venues');
        if (response.data && Array.isArray(response.data)) {
          setVenues(response.data);
        } else {
          console.error('Invalid venues data:', response.data);
          setVenues([]);
        }
      } catch (error) {
        console.error('Error fetching venues:', error);
        setVenues([]);
      }
    };

    if (isFocused) {
      fetchVenues();
    }
  }, [isFocused]);

  const handleGenerateQR = async (venueId) => {
    try {
      const response = await api.get('/admin/qr', {
        params: { venue_id: venueId },
        timeout: 15000
      });

      if (response.data?.qr_string) {
        setCurrentQR(response.data.qr_string);
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 15);
        setExpiryTime(expiry.toLocaleTimeString());
        setShowQRModal(true);
      } else {
        throw new Error(response.data?.error || 'Invalid QR data');
      }
    } catch (error) {
      console.error('QR Generation Error:', error.message);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    }
  };

  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newStartDate = new Date(selectedDate);
      newStartDate.setHours(startDateTime.getHours(), startDateTime.getMinutes());
      setStartDateTime(newStartDate);

      const newEndDate = new Date(selectedDate);
      newEndDate.setHours(endDateTime.getHours(), endDateTime.getMinutes());
      setEndDateTime(newEndDate);
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDateTime(selectedDate);
      if (endDateTime <= selectedDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setHours(newEndDate.getHours() + 1);
        setEndDateTime(newEndDate);
      }
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDateTime(selectedDate);
    }
  };

const handleUpdateVenue = async () => {
  try {
    // Format the session timing correctly for the backend
    const formattedSessionTiming = `${formatDate(startDateTime)} | ${formatTime(startDateTime)} - ${formatTime(endDateTime)}`;

    const updatedVenue = {
      name: venueName,
      capacity: parseInt(venueCapacity),
      level: parseInt(venueLevel),
      session_timing: formattedSessionTiming, // Add this field
      table_details: editingVenue?.table_details || '' // Add this field
    };

    await api.put(`/admin/venues/${editingVenue.id}`, updatedVenue, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
      }
    });

    // Refresh the venues list
    const response = await api.get('/admin/venues');
    setVenues(response.data);

    // Close the modal
    setEditingVenue(null);
  } catch (error) {
    console.error('Error updating venue:', error);
    // Add error handling for better UX
    Alert.alert('Error', 'Failed to update venue. Please check all fields and try again.');
  }
};

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>GD Session Manager</Text>
      <Text style={styles.sectionTitle}>Your Venues</Text>

      {/* Edit Venue Modal */}
      <Modal
        visible={!!editingVenue}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingVenue(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Venue</Text>

            <TextInput
              style={styles.input}
              placeholder="Venue Name"
              value={venueName}
              onChangeText={setVenueName}
            />

            <TextInput
              style={styles.input}
              placeholder="Capacity"
              value={venueCapacity}
              onChangeText={setVenueCapacity}
              keyboardType="numeric"
            />


            <TextInput
              style={styles.input}
              placeholder="Level (1, 2, 3, 4 or 5)"
              value={venueLevel}
              onChangeText={setVenueLevel}
              keyboardType="numeric"
            />


            <Text style={styles.label}>Session Date:</Text>
            <Button
              title={formatDate(startDateTime)}
              onPress={() => setShowDatePicker(true)}
            />

            <Text style={styles.label}>Session Timing:</Text>
            <View style={styles.timePickerContainer}>
              <Button
                title={`Start: ${formatTime(startDateTime)}`}
                onPress={() => setShowStartTimePicker(true)}
              />
              <Text style={styles.timeSeparator}>to</Text>
              <Button
                title={`End: ${formatTime(endDateTime)}`}
                onPress={() => setShowEndTimePicker(true)}
              />
            </View>

            {/* {showDatePicker && (
              <DateTimePicker
                value={startDateTime}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )} */}

            {/* Date & Time Picker for Start */}
{showStartTimePicker && (
  <DatePicker
    modal
    open={showStartTimePicker}
    date={startDateTime}
    mode="datetime"
    minimumDate={new Date()}
    onConfirm={(date) => {
      setShowStartTimePicker(false);
      setStartDateTime(date);
      if (endDateTime <= date) {
        const newEndDate = new Date(date);
        newEndDate.setHours(newEndDate.getHours() + 1);
        setEndDateTime(newEndDate);
      }
    }}
    onCancel={() => setShowStartTimePicker(false)}
  />
)}

{/* Date & Time Picker for End */}
{showEndTimePicker && (
  <DatePicker
    modal
    open={showEndTimePicker}
    date={endDateTime}
    mode="datetime"
    minimumDate={startDateTime}
    onConfirm={(date) => {
      setShowEndTimePicker(false);
      setEndDateTime(date);
    }}
    onCancel={() => setShowEndTimePicker(false)}
  />
)}

            <TextInput
              style={styles.input}
              placeholder="Table Details (e.g., Table 2)"
              value={editingVenue?.table_details || ''}
              onChangeText={(text) => setEditingVenue({ ...editingVenue, table_details: text })}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setEditingVenue(null)} />
              <Button title="Save" onPress={handleUpdateVenue} />
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Venue QR Code</Text>

            {currentQR ? (
              <>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={currentQR}
                    size={200}
                    color="black"
                    backgroundColor="white"
                  />
                </View>
                <Text style={styles.expiryText}>Valid until: {expiryTime}</Text>
              </>
            ) : (
              <Text>Generating QR code...</Text>
            )}

            <View style={styles.modalButtons}>
              <Button title="Close" onPress={() => setShowQRModal(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {venues.map(venue => (
        <View key={venue.id} style={styles.venueCard}>
      

          <View style={[
            styles.levelTag,
            {
              backgroundColor:
                venue.level === 1 ? '#2e86de' :
                  venue.level === 2 ? '#10ac84' :
                  venue.level === 3 ? '#6610acff' :
                  venue.level === 4 ? '#1034acff' :
                    '#ee5253'
            }
          ]}>
            <Text style={styles.levelTagText}>Level {venue.level}</Text>
          </View>

          <View style={styles.venueInfo}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <Text>Capacity: {venue.capacity}</Text>
            <Text>Timing: {venue.session_timing || 'Not specified'}</Text>
            <Text>Table: {venue.table_details || 'Not specified'}</Text>
          </View>

          <View style={styles.venueActions}>
<TouchableOpacity
  onPress={() => {
    setEditingVenue(venue);
    setVenueName(venue.name);
    setVenueCapacity(venue.capacity.toString());
    setVenueLevel(venue.level.toString());
    
    // Parse existing session timing if available
    if (venue.session_timing) {
      const [datePart, timeRange] = venue.session_timing.split(' | ');
      if (datePart && timeRange) {
        // Parse date from datePart (DD/MM/YYYY)
        const [day, month, year] = datePart.split('/').map(Number);
        
        // Parse time range (HH:MM AM/PM - HH:MM AM/PM)
        const [startTimeStr, endTimeStr] = timeRange.split(' - ');
        
        // Parse start time
        const startTime = parseTimeString(startTimeStr);
        const startDate = new Date(year, month - 1, day, startTime.hours, startTime.minutes);
        
        // Parse end time  
        const endTime = parseTimeString(endTimeStr);
        const endDate = new Date(year, month - 1, day, endTime.hours, endTime.minutes);
        
        setStartDateTime(startDate);
        setEndDateTime(endDate);
      }
    }
  }}
>
              <Icon name="edit" size={24} color="#555" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('QrScreen', { venue })}
              style={styles.qrButton}
            >
              <Icon name="qr-code-2" size={24} color="#2e86de" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
    fontWeight: 'bold',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeSeparator: {
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10
  },
  button: {
    marginVertical: 10
  },

  levelTag: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#2e86de', // Default blue color
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelTagText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  venueCard: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  venueActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrButton: {
    marginLeft: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  qrContainer: {
    marginVertical: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  expiryText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2e86de',
    marginBottom: 20,
  },
  hamburgerButton: {
    padding: 10,
  },
  hamburgerLine: {
    width: 25,
    height: 3,
    backgroundColor: 'white',
    marginVertical: 2,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'white',
    paddingTop: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2e86de',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});