// frontend/src/admin/screens/VenueSetup.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

export default function VenueSetup({ route, navigation }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [level, setLevel] = useState('');
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [tableDetails, setTableDetails] = useState('Table 1');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [venueId, setVenueId] = useState(null);

  useEffect(() => {
    if (route.params?.venue) {
      const { venue } = route.params;
      setName(venue.name);
      setCapacity(venue.capacity.toString());
      setLevel(venue.level.toString()); 
      setTableDetails(venue.table_details);
      setVenueId(venue.id);
      setIsEditing(true);
      
      // Parse existing timing if available
      if (venue.session_timing) {
        const [dateStr, timeRange] = venue.session_timing.split(' | ');
        const [startStr, endStr] = timeRange.split(' - ');
        
        const [day, month, year] = dateStr.split('/');
        const [startTime, startPeriod] = startStr.split(' ');
        const [endTime, endPeriod] = endStr.split(' ');
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        let startHours24 = startHours;
        if (startPeriod === 'PM' && startHours < 12) startHours24 += 12;
        if (startPeriod === 'AM' && startHours === 12) startHours24 = 0;
        
        let endHours24 = endHours;
        if (endPeriod === 'PM' && endHours < 12) endHours24 += 12;
        if (endPeriod === 'AM' && endHours === 12) endHours24 = 0;
        
        const startDate = new Date(year, month-1, day, startHours24, startMinutes);
        const endDate = new Date(year, month-1, day, endHours24, endMinutes);
        
        setStartDateTime(startDate);
        setEndDateTime(endDate);
      }
      
      setVenueId(venue.id);
      setIsEditing(true);
    }
  }, [route.params?.venue]);

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
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Keep the existing time but update the date
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
      // Auto-set end time to 1 hour after start if not set
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

  const handleSubmit = async () => {
    const venueData = {
      name,
      capacity: parseInt(capacity),
      level: parseInt(level),
      session_timing: `${formatDate(startDateTime)} | ${formatTime(startDateTime)} - ${formatTime(endDateTime)}`,
      table_details: tableDetails,
      id: isEditing ? venueId : undefined,
    };

    try {
      if (isEditing) {
        await api.put(`/admin/venues`, venueData); 
      } else {
        await api.post('/admin/venues', venueData);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving venue:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save venue'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isEditing ? 'Edit Venue' : 'Create New Venue'}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Venue Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Capacity"
        keyboardType="numeric"
        value={capacity}
        onChangeText={setCapacity}
      />


      <TextInput
        style={styles.input}
        placeholder="Level (1, 2, 3, 4 or 5)"
        keyboardType="numeric"
        value={level}
        onChangeText={setLevel}
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
      
      {showDatePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      
      {showStartTimePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleStartTimeChange}
        />
      )}
      
      {showEndTimePicker && (
        <DateTimePicker
          value={endDateTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleEndTimeChange}
          minimumDate={startDateTime}
        />
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Table Details (e.g., Table 2)"
        value={tableDetails}
        onChangeText={setTableDetails}
      />
      
      <Button
        title={isEditing ? 'Update Venue' : 'Create Venue'}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
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
});