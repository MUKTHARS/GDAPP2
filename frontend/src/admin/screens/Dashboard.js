import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, Modal, Alert, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';

export default function Dashboard({ navigation }) {
    const [startDateTime, setStartDateTime] = useState(new Date());
    const [endDateTime, setEndDateTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [venues, setVenues] = useState([]);
    const [editingVenue, setEditingVenue] = useState(null);
    const [venueName, setVenueName] = useState('');
    const [venueCapacity, setVenueCapacity] = useState('');
    const [venueLevel, setVenueLevel] = useState('1');
    const [tableDetails, setTableDetails] = useState('');
    const [showQRModal, setShowQRModal] = useState(false);
    const [currentQR, setCurrentQR] = useState(null);
    const [expiryTime, setExpiryTime] = useState('');
    const isFocused = useIsFocused();

    useEffect(() => {
        fetchVenues();
    }, [isFocused]);

    const fetchVenues = async () => {
        try {
            const response = await api.get('/admin/venues');
            if (response.data && Array.isArray(response.data)) {
                setVenues(response.data);
            } else {
                console.error('Invalid venues data:', response.data);
                setVenues([]);
            }
        } catch (error) {
            console.error('Error fetching venues:', error);
            setVenues([]);
        }
    };

    const handleDeleteVenue = async (venueId) => {
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
                            const response = await api.admin.deleteVenue(venueId);
                            if (response.status === 200) {
                                Alert.alert('Success', 'Venue deleted successfully');
                                fetchVenues();
                            } else {
                                Alert.alert('Error', response.data?.error || 'Failed to delete venue');
                            }
                        } catch (error) {
                            console.error('Delete venue error:', error);
                            Alert.alert('Error', error.response?.data?.error || 'Failed to delete venue');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateVenue = async () => {
        try {
            const formattedSessionTiming = `${formatDate(startDateTime)} | ${formatTime(startDateTime)} - ${formatTime(endDateTime)}`;

            const updatedVenue = {
                id: editingVenue.id,
                name: venueName,
                capacity: parseInt(venueCapacity),
                level: parseInt(venueLevel),
                session_timing: formattedSessionTiming,
                table_details: tableDetails
            };

            const response = await api.admin.updateVenue(editingVenue.id, updatedVenue);
            
            if (response.status === 200) {
                Alert.alert('Success', 'Venue updated successfully');
                fetchVenues();
                setEditingVenue(null);
            } else {
                Alert.alert('Error', response.data?.error || 'Failed to update venue');
            }
        } catch (error) {
            console.error('Error updating venue:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to update venue');
        }
    };

    const parseTimeString = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        const [hoursStr, minutesStr] = time.split(':');
        
        let hours = parseInt(hoursStr);
        const minutes = parseInt(minutesStr);
        
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        return { hours, minutes };
    };

    const formatDate = (date) => {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatTime = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
    };

    const handleEditVenue = (venue) => {
        setEditingVenue(venue);
        setVenueName(venue.name);
        setVenueCapacity(venue.capacity.toString());
        setVenueLevel(venue.level.toString());
        setTableDetails(venue.table_details || '');
        
        if (venue.session_timing) {
            const [datePart, timeRange] = venue.session_timing.split(' | ');
            if (datePart && timeRange) {
                const [day, month, year] = datePart.split('/').map(Number);
                const [startTimeStr, endTimeStr] = timeRange.split(' - ');
                
                const startTime = parseTimeString(startTimeStr);
                const startDate = new Date(year, month - 1, day, startTime.hours, startTime.minutes);
                
                const endTime = parseTimeString(endTimeStr);
                const endDate = new Date(year, month - 1, day, endTime.hours, endTime.minutes);
                
                setStartDateTime(startDate);
                setEndDateTime(endDate);
            }
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>GD Session Manager</Text>
            <Text style={styles.sectionTitle}>Your Venues</Text>

            {/* Edit Venue Modal */}
            <Modal
                visible={!!editingVenue}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditingVenue(null)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Venue</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Venue Name"
                            value={venueName}
                            onChangeText={setVenueName}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Capacity"
                            value={venueCapacity}
                            onChangeText={setVenueCapacity}
                            keyboardType="numeric"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Level (1-5)"
                            value={venueLevel}
                            onChangeText={setVenueLevel}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Session Date:</Text>
                        <Button
                            title={formatDate(startDateTime)}
                            onPress={() => setShowDatePicker(true)}
                        />

                        <Text style={styles.label}>Session Timing:</Text>
                        <View style={styles.timePickerContainer}>
                            <Button
                                title={`Start: ${formatTime(startDateTime)}`}
                                onPress={() => setShowStartTimePicker(true)}
                            />
                            <Text style={styles.timeSeparator}>to</Text>
                            <Button
                                title={`End: ${formatTime(endDateTime)}`}
                                onPress={() => setShowEndTimePicker(true)}
                            />
                        </View>

                        {showStartTimePicker && (
                            <DatePicker
                                modal
                                open={showStartTimePicker}
                                date={startDateTime}
                                mode="datetime"
                                minimumDate={new Date()}
                                onConfirm={(date) => {
                                    setShowStartTimePicker(false);
                                    setStartDateTime(date);
                                    if (endDateTime <= date) {
                                        const newEndDate = new Date(date);
                                        newEndDate.setHours(newEndDate.getHours() + 1);
                                        setEndDateTime(newEndDate);
                                    }
                                }}
                                onCancel={() => setShowStartTimePicker(false)}
                            />
                        )}

                        {showEndTimePicker && (
                            <DatePicker
                                modal
                                open={showEndTimePicker}
                                date={endDateTime}
                                mode="datetime"
                                minimumDate={startDateTime}
                                onConfirm={(date) => {
                                    setShowEndTimePicker(false);
                                    setEndDateTime(date);
                                }}
                                onCancel={() => setShowEndTimePicker(false)}
                            />
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="Table Details"
                            value={tableDetails}
                            onChangeText={setTableDetails}
                        />

                        <View style={styles.modalButtons}>
                            <Button title="Cancel" onPress={() => setEditingVenue(null)} />
                            <Button title="Save" onPress={handleUpdateVenue} />
                        </View>
                    </View>
                </View>
            </Modal>

            {venues.map(venue => (
                <View key={venue.id} style={styles.venueCard}>
                    <View style={[
                        styles.levelTag,
                        {
                            backgroundColor:
                                venue.level === 1 ? '#2e86de' :
                                venue.level === 2 ? '#10ac84' :
                                venue.level === 3 ? '#6610acff' :
                                venue.level === 4 ? '#1034acff' :
                                '#ee5253'
                        }
                    ]}>
                        <Text style={styles.levelTagText}>Level {venue.level}</Text>
                    </View>

                    <View style={styles.venueInfo}>
                        <Text style={styles.venueName}>{venue.name}</Text>
                        <Text>Capacity: {venue.capacity}</Text>
                        <Text>Timing: {venue.session_timing || 'Not specified'}</Text>
                        <Text>Table: {venue.table_details || 'Not specified'}</Text>
                    </View>

                    <View style={styles.venueActions}>
                        <TouchableOpacity onPress={() => handleEditVenue(venue)}>
                            <Icon name="edit" size={24} color="#555" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleDeleteVenue(venue.id)}>
                            <Icon name="delete" size={24} color="#ff6b6b" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('QrScreen', { venue })}
                            style={styles.qrButton}
                        >
                            <Icon name="qr-code-2" size={24} color="#2e86de" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    venueCard: {
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    levelTag: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 5,
        borderRadius: 4,
    },
    levelTagText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    venueInfo: {
        marginBottom: 10,
    },
    venueName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    venueActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    timeSeparator: {
        marginHorizontal: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
});