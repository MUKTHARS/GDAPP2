import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';

const VenueCard = ({ venue, onEdit, onGenerateQR, onDelete }) => {
    const [date, timeRange] = venue.session_timing ? venue.session_timing.split(' | ') : ['', ''];
    
    const handleDelete = async () => {
        Alert.alert(
            'Delete Venue',
            'Are you sure you want to delete this venue?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.admin.deleteVenue(venue.id);
                            onDelete(); // Refresh the list
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete venue');
                        }
                    }
                }
            ]
        );
    };

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
                        onPress={handleDelete}
                        style={styles.iconButton}
                    >
                        <Icon name="delete" size={24} color="#FF3B30" />
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