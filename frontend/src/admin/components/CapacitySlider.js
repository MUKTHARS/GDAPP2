import React from 'react';
import { View, Text, Slider, StyleSheet } from 'react-native';

export default function CapacitySlider({ value, onChange, min = 5, max = 20 }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Capacity: {value} {value === 1 ? 'student' : 'students'}
      </Text>
      <Slider
        value={value}
        onValueChange={onChange}
        minimumValue={min}
        maximumValue={max}
        step={1}
        thumbTintColor="#2e86de"
        minimumTrackTintColor="#2e86de"
      />
      <View style={styles.range}>
        <Text>{min}</Text>
        <Text>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    marginVertical: 15
  },
  label: {
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '500'
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});