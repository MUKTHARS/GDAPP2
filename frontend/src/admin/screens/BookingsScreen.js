import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { globalStyles, colors } from '../../student/assets/globalStyles';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminHamburgerHeader from '../components/AdminHamburgerHeader';

export default function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/bookings');
      
      if (response.data && Array.isArray(response.data)) {
        // Format the data to match expected structure
        const formattedBookings = response.data.map(booking => ({
          ...booking,
          student_name: booking.student_name || 'Unknown Student',
          venue_name: booking.venue_name || 'Unknown Venue',
          session_level: booking.session_level || 1,
          booked_at: booking.booked_at || new Date().toISOString(),
          formattedDate: formatBookingDate(booking.booked_at)
        }));
        setBookings(formattedBookings);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatBookingDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original if formatting fails
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderBookingItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.studentName}>{item.student_name}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Level {item.session_level}</Text>
        </View>
      </View>
      
      <View style={styles.venueInfo}>
        <Icon name="place" size={18} color={colors.primary} />
        <Text style={styles.venueText}>{item.venue_name}</Text>
      </View>
      
      <View style={styles.timeInfo}>
        <Icon name="access-time" size={18} color={colors.textSecondary} />
        <Text style={styles.timeText}>{item.formattedDate}</Text>
      </View>
      
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionId}>Session ID: {item.session_id}</Text>
      </View>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      {/* <AdminHamburgerHeader navigation={navigation} title="Active Bookings" /> */}
      
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchBookings}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="event-busy" size={50} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No active bookings found</Text>
          <Text style={styles.emptySubtext}>Students will appear here when they book venues</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchBookings}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => `${item.student_id}-${item.session_id}`}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  levelBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  sessionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  sessionId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 10,
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  listContainer: {
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    width: 120,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    width: 150,
  },
  refreshButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});

// import React, { useState, useEffect } from 'react';
// import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
// import { globalStyles, colors } from '../../student/assets/globalStyles';

// import api from '../services/api';
// import AdminHamburgerHeader from '../components/AdminHamburgerHeader';

// export default function BookingsScreen({ navigation }) {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchBookings();
//   }, []);

//   const fetchBookings = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const response = await api.get('/admin/bookings');
//       setBookings(response.data);
//     } catch (error) {
//       console.error('Failed to fetch bookings:', error);
//       setError(error.response?.data?.error || 'Failed to load bookings');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderBookingItem = ({ item }) => (
//     <View style={styles.bookingCard}>
//       <Text style={styles.studentName}>{item.student_name}</Text>
//       <Text style={styles.detailText}>Venue: {item.venue_name}</Text>
//       <Text style={styles.detailText}>Level: {item.session_level}</Text>
//       <Text style={styles.detailText}>Booked at: {new Date(item.booked_at).toLocaleString()}</Text>
//     </View>
//   );

//   return (
//     <View style={globalStyles.container}>
//       {/* <AdminHamburgerHeader 
//         title="Student Bookings" 
//         navigation={navigation} 
//       /> */}
      
//       {loading ? (
//         <ActivityIndicator size="large" color={colors.primary} />
//       ) : error ? (
//         <View style={styles.errorContainer}>
//           <Text style={styles.errorText}>{error}</Text>
//         </View>
//       ) : bookings.length === 0 ? (
//         <Text style={styles.noBookingsText}>No active bookings found</Text>
//       ) : (
//         <FlatList
//           data={bookings}
//           keyExtractor={item => `${item.student_id}-${item.session_id}`}
//           renderItem={renderBookingItem}
//           contentContainerStyle={styles.listContainer}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   bookingCard: {
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   studentName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.primary,
//     marginBottom: 8,
//   },
//   detailText: {
//     fontSize: 14,
//     color: colors.textSecondary,
//     marginBottom: 4,
//   },
//   errorContainer: {
//     alignItems: 'center',
//     padding: 20,
//   },
//   errorText: {
//     color: colors.error,
//     textAlign: 'center',
//   },
//   noBookingsText: {
//     textAlign: 'center',
//     marginTop: 20,
//     color: colors.textSecondary,
//   },
//   listContainer: {
//     padding: 16,
//   },
// });