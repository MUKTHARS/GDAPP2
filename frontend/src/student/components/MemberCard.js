import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MemberCard({ member, onSelect, selected }) {
  return (
    <View style={[styles.card, selected && styles.selectedCard]}>
      <Text style={styles.name}>{member.name}</Text>
      <Text style={styles.department}>{member.department}</Text>
      
      <View style={styles.rankButtons}>
        {[1, 2, 3].map(rank => (
          <TouchableOpacity
            key={rank}
            style={styles.rankButton}
            onPress={() => onSelect(rank)}
          >
            <Text>{rank}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCard: {
    borderColor: '#2e86de',
    backgroundColor: '#f0f7ff',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  department: {
    color: '#666',
    marginBottom: 10,
  },
  rankButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rankButton: {
    padding: 8,
    width: 30,
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 15,
  },
});