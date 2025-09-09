// components/EditableVenueCard.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

const EditableVenueCard = ({ venue, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedVenue, setEditedVenue] = useState({
    name: venue.name,
    capacity: venue.capacity.toString()
  });

  const handleSave = () => {
    onSave({
      ...venue,
      name: editedVenue.name,
      capacity: parseInt(editedVenue.capacity)
    });
    setIsEditing(false);
  };

  return (
    <View style={styles.card}>
      {isEditing ? (
        <>
          <TextInput
            style={styles.input}
            value={editedVenue.name}
            onChangeText={(text) => setEditedVenue({...editedVenue, name: text})}
          />
          <TextInput
            style={styles.input}
            value={editedVenue.capacity}
            onChangeText={(text) => setEditedVenue({...editedVenue, capacity: text})}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.name}>{venue.name}</Text>
          <Text style={styles.capacity}>Capacity: {venue.capacity}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setIsEditing(true)}>
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  capacity: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default EditableVenueCard;