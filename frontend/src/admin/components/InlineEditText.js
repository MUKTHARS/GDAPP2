// components/InlineEditText.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

const InlineEditText = ({ value, onSave, style }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);

  const handleSave = () => {
    onSave(editedValue);
    setIsEditing(false);
  };

  return isEditing ? (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TextInput
        value={editedValue}
        onChangeText={setEditedValue}
        style={[style, { flex: 1, borderBottomWidth: 1, borderColor: '#ddd' }]}
        autoFocus
      />
      <TouchableOpacity onPress={handleSave} style={{ marginLeft: 10 }}>
        <Text style={{ color: 'green' }}>✓</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <TouchableOpacity onPress={() => setIsEditing(true)}>
      <Text style={style}>{value}</Text>
    </TouchableOpacity>
  );
};

export default InlineEditText;