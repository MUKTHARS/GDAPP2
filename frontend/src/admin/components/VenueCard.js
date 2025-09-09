// frontend/src/admin/components/VenueCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const VenueCard = ({ venue, onEdit, onGenerateQR }) => {
  // Split the session timing into date and time range
  const [date, timeRange] = venue.session_timing ? venue.session_timing.split(' | ') : ['', ''];
  
  return (
    <View style={styles.card}>
      <View style={styles.rowContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <Text>Capacity: {venue.capacity}</Text>
          <Text>Level: {venue.level}</Text>
         {date && <Text>Date: {date}</Text>}
          {timeRange && <Text>Timing: {timeRange}</Text>}
          <Text>Table: {venue.table_details}</Text>
        </View>

        <View style={styles.iconContainer}>
          <TouchableOpacity 
            onPress={() => onEdit(venue)}
            style={styles.iconButton}
          >
            <Icon name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onGenerateQR(venue.id)}
            style={styles.iconButton}
          >
            <Icon name="qr-code" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Keep your existing styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  iconContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 10,
  },
});

export default VenueCard;

// // components/VenueCard.js
// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// const VenueCard = ({ venue, onEdit, onGenerateQR }) => {
//   return (
//     <View style={styles.card}>
//   <View style={styles.rowContainer}>
//     <View style={{ flex: 1 }}>
//       <Text style={styles.venueName}>{venue.name}</Text>
//       <Text>Capacity: {venue.capacity}</Text>
//     </View>

//     <View style={styles.iconContainer}>
//       <TouchableOpacity 
//         onPress={() => onEdit(venue)}
//         style={styles.iconButton}
//       >
//         <Icon name="edit" size={24} color="#007AFF" />
//       </TouchableOpacity>
      
//       <TouchableOpacity 
//         onPress={() => onGenerateQR(venue.id)}
//         style={styles.iconButton}
//       >
//         <Icon name="qr-code" size={24} color="#007AFF" />
//       </TouchableOpacity>
//     </View>
//   </View>
// </View>

//   );
// };

