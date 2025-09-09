import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import api from '../services/api';
import { sideMenuStyles } from '../assets/styles/sideMenuStyles';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));


  const toggleSideMenu = () => {
    if (showSideMenu) {
      Animated.timing(slideAnim, {
        toValue: -250,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSideMenu(false));
    } else {
      setShowSideMenu(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };
    
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const response = await api.get('/admin/analytics/qualifications');
  //       setData(response.data);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   };
  //   fetchData();
  // }, []);

  return (
    <View style={styles.container}>
        
      
      <Text style={styles.title}>Qualification Analytics</Text>
      
      {data && (
        <BarChart
          data={{
            labels: Object.keys(data),
            datasets: [{
              data: Object.values(data)
            }]
          }}
          width={300}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(46, 134, 222, ${opacity})`,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'left',
    padding: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2e86de',
    marginBottom: 20,
  },
  hamburgerButton: {
    padding: 10,
  },
  hamburgerLine: {
    width: 25,
    height: 3,
    backgroundColor: 'white',
    marginVertical: 2,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'white',
    paddingTop: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2e86de',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  hamburgerButton: {
    padding: 10,
  },
  
});