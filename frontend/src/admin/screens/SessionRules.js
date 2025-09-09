import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function SessionRules() {
  const [rules, setRules] = useState({
    level: 1,
    prepTime: 5,
    discussionTime: 20,
    penaltyThreshold: 2.0,
    allowOverride: true
  });

  const saveRules = async () => {
    try {
      await api.put('/admin/rules', rules);
      alert('Rules updated!');
    } catch (error) {
      alert('Failed to update rules');
    }
  };

  return (
    <View style={styles.container}>
       
      <Text style={styles.header}>GD Level {rules.level} Rules</Text>
      
      <View style={styles.ruleItem}>
        <Text>Preparation Time: {rules.prepTime} mins</Text>
      </View>

      <View style={styles.ruleItem}>
        <Text>Discussion Time: {rules.discussionTime} mins</Text>
      </View>

      <View style={styles.ruleItem}>
        <Text>Penalty Threshold: {rules.penaltyThreshold} points</Text>
      </View>

      <View style={styles.ruleItem}>
        <Text>Allow Faculty Override</Text>
        <Switch
          value={rules.allowOverride}
          onValueChange={(val) => setRules({...rules, allowOverride: val})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: '#eee'
  }
});