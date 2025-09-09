import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function TimerConfig({ label, value, onChange, unit = 'mins' }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}:</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={String(value)}
          onChangeText={(text) => onChange(parseInt(text) || 0)}
          keyboardType="numeric"
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15
  },
  label: {
    marginBottom: 5,
    fontWeight: '500'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    width: 60,
    marginRight: 10
  },
  unit: {
    color: '#666'
  }
});