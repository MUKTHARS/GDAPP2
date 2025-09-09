import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function QrList({ venues, navigation }) {
  return (
    <View style={styles.container}>
      {venues.map(venue => (
        <TouchableOpacity
  key={venue.id}
  style={styles.venueCard}
  onPress={() => navigation.navigate('QrScreen', { venue })}
>
  <View style={styles.venueInfo}>
    <Text style={styles.venueName}>{venue.name}</Text>
    <Text>Capacity: {venue.capacity}</Text>
  </View>
  <View style={styles.actionIcons}>
    <TouchableOpacity onPress={(e) => {
      e.stopPropagation();
      navigation.navigate('EditVenue', { venue });
    }}>
      <Icon name="edit" size={24} color="#555" style={styles.icon} />
    </TouchableOpacity>
    <Icon name="qr-code-2" size={24} color="#2e86de" style={styles.icon} />
  </View>
</TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  venueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  venueInfo: {
    flex: 1,
    marginRight: 10, // Add spacing
  },
  venueName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 15, // Consistent spacing between icons
  }
});