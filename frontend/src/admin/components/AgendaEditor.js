// frontend/src/admin/components/AgendaEditor.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TimerConfig from './TimerConfig';

export default function AgendaEditor({ agenda, onChange }) {
  const updateTime = (key, value) => {
    const newAgenda = { ...agenda };
    newAgenda[key] = parseInt(value) || 0;
    onChange(newAgenda);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Session Agenda</Text>
      
      <TimerConfig
    label="Preparation Time (minutes)"
    value={agenda.prep_time ? agenda.prep_time.toString() : "0"}
    onChange={(val) => updateTime('prep_time', val)}
/>
      
      <TimerConfig
        label="Discussion Time (minutes)"
        value={agenda.discussion.toString()}
        onChange={(val) => updateTime('discussion', val)}
      />
      
      <TimerConfig
        label="Survey Time (minutes)"
        value={agenda.survey.toString()}
        onChange={(val) => updateTime('survey', val)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  header: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16
  }
});

// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import TimerConfig from './TimerConfig';

// export default function AgendaEditor({ agenda, onChange }) {
//   const updateTime = (key, value) => {
//     onChange({ ...agenda, [key]: value });
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.header}>Session Agenda</Text>
      
//       <TimerConfig
//         label="Preparation Time"
//         value={agenda.prep_time}
//         onChange={(val) => updateTime('prep_time', val)}
//       />
      
//       <TimerConfig
//         label="Discussion Time"
//         value={agenda.discussion}
//         onChange={(val) => updateTime('discussion', val)}
//       />
      
//       <TimerConfig
//         label="Survey Time"
//         value={agenda.survey}
//         onChange={(val) => updateTime('survey', val)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginVertical: 10,
//     padding: 15,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 8
//   },
//   header: {
//     fontWeight: 'bold',
//     marginBottom: 10,
//     fontSize: 16
//   }
// });