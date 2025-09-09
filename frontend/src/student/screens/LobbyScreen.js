import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Image
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors, layout } from '../assets/globalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import HamburgerHeader from '../components/HamburgerHeader';

export default function LobbyScreen({ navigation, route }) {
    const { sessionId } = route.params;
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    const fetchParticipants = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await api.get('/student/session/participants', { 
                params: { session_id: sessionId },
                headers: {
                    Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
                },
                validateStatus: function (status) {
                    return status === 200 || status === 404;
                }
            });
            
            if (response.status === 404) {
                setParticipants([]);
            } else {
                setParticipants(response.data?.data || []);
            }
        } catch (error) {
            console.error('Error fetching participants:', error);
            setParticipants([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchParticipants();

        // Poll every 5 seconds
        const interval = setInterval(fetchParticipants, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [sessionId]);

    const handleReady = async () => {
        try {
            setIsReady(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            await api.put('/student/session/status', { 
                sessionId, 
                status: 'active'
            }, {
                headers: {
                    Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
                }
            });
            
            navigation.replace('GdSession', { sessionId });
        } catch (error) {
            console.error('Error starting session:', error);
            setIsReady(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingTitle}>Joining Session</Text>
                        <Text style={styles.loadingSubtitle}>Please wait while we set up your lobby...</Text>
                    </View>
                </View>
            </View>
        );
    }

   const renderParticipantItem = ({ item, index }) => (
    <View style={styles.participantCard}>
        <View style={styles.participantHeader}>
            <View style={styles.participantAvatar}>
                {item.profileImage ? (
                    <Image
                        source={{ uri: item.profileImage }}
                        style={styles.avatarImage}
                        onError={(e) => {
                            // Fallback to gradient avatar if image fails to load
                            console.log('Image load error:', e.nativeEvent.error);
                        }}
                    />
                ) : (
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        style={styles.avatarGradient}
                    >
                        <Icon name="person" size={20} color="#fff" />
                    </LinearGradient>
                )}
            </View>
            <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{item.name}</Text>
                {item.department && (
                    <Text style={styles.participantDept}>{item.department}</Text>
                )}
            </View>
            <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
            </View>
        </View>
    </View>
);

    return (
        <View style={styles.container}>
            <HamburgerHeader title='Lobby'/>
            <View style={styles.contentContainer}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.title}>Session Lobby</Text>
                    <Text style={styles.subtitle}>Waiting for participants to join...</Text>
                </View>

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Icon name="group" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.statNumber}>{participants.length}</Text>
                            <Text style={styles.statLabel}>Participants</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Icon name="schedule" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.statNumber}>5s</Text>
                            <Text style={styles.statLabel}>Auto Refresh</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Icon name="wifi" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.statNumber}>Live</Text>
                            <Text style={styles.statLabel}>Status</Text>
                        </View>
                    </View>
                </View>
                
                {/* Participants Section */}
                <View style={styles.participantsContainer}>
                    <View style={styles.participantsHeader}>
                        <Text style={styles.participantsTitle}>
                            Participants ({participants.length})
                        </Text>
                        <View style={styles.refreshIndicator}>
                            <Icon name="sync" size={16} color="#94A3B8" />
                        </View>
                    </View>
                    
                    <View style={styles.participantsList}>
                        {participants.length > 0 ? (
                            <FlatList
                                data={participants}
                                keyExtractor={item => item.id}
                                renderItem={renderParticipantItem}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.listContent}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Icon name="person-add" size={48} color="#6B7280" />
                                </View>
                                <Text style={styles.emptyTitle}>Waiting for Others</Text>
                                <Text style={styles.emptyText}>
                                    Other participants will appear here when they join the session
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Ready Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.readyButton,
                            isReady && styles.readyButtonDisabled
                        ]}
                        onPress={handleReady}
                        disabled={isReady}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={isReady ? ['#6B7280', '#4B5563'] : ['#10B981', '#059669']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.readyButtonGradient}
                        >
                            <View style={styles.readyButtonContent}>
                                {isReady ? (
                                    <>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.readyButtonText}>Starting Session...</Text>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="play-arrow" size={24} color="#fff" />
                                        <Text style={styles.readyButtonText}>I'm Ready</Text>
                                    </>
                                )}
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    <Text style={styles.readyHint}>
                        {isReady ? 'Launching your session...' : 'Tap when you\'re ready to begin'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030508ff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingCard: {
        backgroundColor: '#090d13ff',
        borderRadius: 20,
        paddingVertical: 40,
        paddingHorizontal: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F8FAFC',
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 25,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F8FAFC',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        fontWeight: '500',
    },
    statsContainer: {
        backgroundColor: '#090d13ff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconContainer: {
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#334155',
        marginHorizontal: 16,
    },
    participantsContainer: {
        flex: 1,
        marginBottom: 20,
    },
    participantsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    participantsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    refreshIndicator: {
        padding: 6,
    },
    participantsList: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 10,
    },
    participantCard: {
        backgroundColor: '#090d13ff',
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    participantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    participantAvatar: {
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: 12,
    },
    avatarGradient: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 2,
    },
    participantDept: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '400',
    },
    onlineIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    onlineText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#090d13ff',
        borderRadius: 16,
        paddingVertical: 40,
        paddingHorizontal: 32,
        borderWidth: 1,
        borderColor: '#334155',
    },
    emptyIconContainer: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomContainer: {
        alignItems: 'center',
    },
    readyButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    readyButtonDisabled: {
        opacity: 0.7,
    },
    readyButtonGradient: {
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    readyButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    readyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    readyHint: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});


// import React, { useState, useEffect } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   ActivityIndicator, 
//   FlatList,
//   TouchableOpacity,
//   ImageBackground,
//   Image
// } from 'react-native';
// import api from '../services/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { globalStyles, colors, layout } from '../assets/globalStyles';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import HamburgerHeader from '../components/HamburgerHeader';
// export default function LobbyScreen({ navigation, route }) {
//     const { sessionId } = route.params;
//     const [participants, setParticipants] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [isReady, setIsReady] = useState(false);


//     const fetchParticipants = async () => {
//         try {
//             const token = await AsyncStorage.getItem('token');
//             if (!token) {
//                 throw new Error('No authentication token found');
//             }

//             const response = await api.get('/student/session/participants', { 
//                 params: { session_id: sessionId },
//                 headers: {
//                     Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
//                 },
//                 validateStatus: function (status) {
//                     return status === 200 || status === 404;
//                 }
//             });
            
//             if (response.status === 404) {
//                 setParticipants([]);
//             } else {
//                 setParticipants(response.data?.data || []);
//             }
//         } catch (error) {
//             console.error('Error fetching participants:', error);
//             setParticipants([]);
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         // Initial fetch
//         fetchParticipants();

//         // Poll every 5 seconds
//         const interval = setInterval(fetchParticipants, 5000);

//         return () => {
//             clearInterval(interval);
//         };
//     }, [sessionId]);

//     const handleReady = async () => {
//         try {
//             setIsReady(true);
//             const token = await AsyncStorage.getItem('token');
//             if (!token) {
//                 throw new Error('No authentication token found');
//             }

//             await api.put('/student/session/status', { 
//                 sessionId, 
//                 status: 'active'
//             }, {
//                 headers: {
//                     Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
//                 }
//             });
            
//             navigation.replace('GdSession', { sessionId });
//         } catch (error) {
//             console.error('Error starting session:', error);
//             setIsReady(false);
//         }
//     };

//     if (loading) {
//         return (
//             <LinearGradient
//                 colors={['#667eea', '#764ba2', '#667eea']}
//                 style={styles.container}
//             >
//                 <View style={styles.loadingContainer}>
//                     <View style={styles.loadingCard}>
//                         <LinearGradient
//                             colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//                             style={styles.loadingCardGradient}
//                         >
//                             <View style={styles.loadingIconContainer}>
//                                 <ActivityIndicator size="large" color="#fff" />
//                             </View>
//                             <Text style={styles.loadingTitle}>Joining Session</Text>
//                             <Text style={styles.loadingSubtitle}>Please wait while we set up your lobby...</Text>
//                         </LinearGradient>
//                     </View>
//                 </View>
//             </LinearGradient>
//         );
//     }

//    const renderParticipantItem = ({ item, index }) => (
//     <View style={[styles.participantCard, { opacity: 0.8 + (index * 0.02) }]}>
//         <LinearGradient
//             colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//             start={{x: 0, y: 0}}
//             end={{x: 1, y: 1}}
//             style={styles.participantGradient}
//         >
            
//             <View style={styles.participantHeader}>
//                 <View style={styles.participantAvatar}>
//                     {item.profileImage ? (
//                         <Image
//                             source={{ uri: item.profileImage }}
//                             style={styles.avatarImage}
//                             onError={(e) => {
//                                 // Fallback to gradient avatar if image fails to load
//                                 console.log('Image load error:', e.nativeEvent.error);
//                             }}
//                         />
//                     ) : (
//                         <LinearGradient
//                             colors={['#4CAF50', '#43A047']}
//                             style={styles.avatarGradient}
//                         >
//                             <Icon name="person" size={20} color="#fff" />
//                         </LinearGradient>
//                     )}
//                 </View>
//                 <View style={styles.participantInfo}>
//                     <Text style={styles.participantName}>{item.name}</Text>
//                     {item.department && (
//                         <Text style={styles.participantDept}>{item.department}</Text>
//                     )}
//                 </View>
//                 <View style={styles.onlineIndicator}>
//                     <View style={styles.onlineDot} />
//                     <Text style={styles.onlineText}>Online</Text>
//                 </View>
//             </View>
//         </LinearGradient>
//     </View>
// );

//     return (
//         <LinearGradient
//             colors={['#667eea', '#764ba2', '#667eea']}
//             style={styles.container}
//         ><HamburgerHeader/>
//             <View style={styles.contentContainer}>
//                 {/* Header Section */}
                
//                 <View style={styles.header}>
//                     <View style={styles.headerIconContainer}>
                       
//                     </View>
//                     <Text style={styles.title}>Session Lobby</Text>
//                     <Text style={styles.subtitle}>Waiting for participants to join...</Text>
//                 </View>

//                 {/* Stats Section */}
//                 <View style={styles.statsContainer}>
//                     <LinearGradient
//                         colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//                         style={styles.statsGradient}
//                     >
//                         <View style={styles.statsRow}>
//                             <View style={styles.statItem}>
//                                 <View style={styles.statIconContainer}>
//                                     <Icon name="group" size={24} color="#fff" />
//                                 </View>
//                                 <Text style={styles.statNumber}>{participants.length}</Text>
//                                 <Text style={styles.statLabel}>Participants</Text>
//                             </View>
//                             <View style={styles.statDivider} />
//                             <View style={styles.statItem}>
//                                 <View style={styles.statIconContainer}>
//                                     <Icon name="schedule" size={24} color="#fff" />
//                                 </View>
//                                 <Text style={styles.statNumber}>5s</Text>
//                                 <Text style={styles.statLabel}>Auto Refresh</Text>
//                             </View>
//                             <View style={styles.statDivider} />
//                             <View style={styles.statItem}>
//                                 <View style={styles.statIconContainer}>
//                                     <Icon name="wifi" size={24} color="#4CAF50" />
//                                 </View>
//                                 <Text style={styles.statNumber}>Live</Text>
//                                 <Text style={styles.statLabel}>Status</Text>
//                             </View>
//                         </View>
//                     </LinearGradient>
//                 </View>
                
//                 {/* Participants Section */}
//                 <View style={styles.participantsContainer}>
//                     <View style={styles.participantsHeader}>
//                         <Text style={styles.participantsTitle}>
//                             Participants ({participants.length})
//                         </Text>
//                         <View style={styles.refreshIndicator}>
//                             <Icon name="sync" size={16} color="rgba(255,255,255,0.7)" />
//                         </View>
//                     </View>
                    
//                     <View style={styles.participantsList}>
//                         {participants.length > 0 ? (
//                             <FlatList
//                                 data={participants}
//                                 keyExtractor={item => item.id}
//                                 renderItem={renderParticipantItem}
//                                 showsVerticalScrollIndicator={false}
//                                 contentContainerStyle={styles.listContent}
//                             />
//                         ) : (
//                             <View style={styles.emptyContainer}>
//                                 <LinearGradient
//                                     colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//                                     style={styles.emptyGradient}
//                                 >
//                                     <View style={styles.emptyIconContainer}>
//                                         <Icon name="person-add" size={48} color="rgba(255,255,255,0.6)" />
//                                     </View>
//                                     <Text style={styles.emptyTitle}>Waiting for Others</Text>
//                                     <Text style={styles.emptyText}>
//                                         Other participants will appear here when they join the session
//                                     </Text>
//                                 </LinearGradient>
//                             </View>
//                         )}
//                     </View>
//                 </View>

//                 {/* Ready Button */}
//                 <View style={styles.bottomContainer}>
//                     <TouchableOpacity 
//                         style={styles.readyButton}
//                         onPress={handleReady}
//                         disabled={isReady}
//                         activeOpacity={0.8}
//                     >
//                         <LinearGradient
//                             colors={isReady ? ['#9E9E9E', '#757575'] : ['#4CAF50', '#43A047', '#388E3C']}
//                             start={{x: 0, y: 0}}
//                             end={{x: 1, y: 1}}
//                             style={styles.readyButtonGradient}
//                         >
//                             <View style={styles.readyButtonContent}>
//                                 {isReady ? (
//                                     <>
//                                         <ActivityIndicator size="small" color="#fff" />
//                                         <Text style={styles.readyButtonText}>Starting Session...</Text>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <Icon name="play-arrow" size={24} color="#fff" />
//                                         <Text style={styles.readyButtonText}>I'm Ready</Text>
//                                     </>
//                                 )}
//                             </View>
//                         </LinearGradient>
//                     </TouchableOpacity>
                    
//                     <Text style={styles.readyHint}>
//                         {isReady ? 'Launching your session...' : 'Tap when you\'re ready to begin'}
//                     </Text>
//                 </View>
//             </View>
//         </LinearGradient>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingHorizontal: 40,
//     },
//     loadingCard: {
//         borderRadius: 20,
//         overflow: 'hidden',
//         width: '100%',
//     },
//     loadingCardGradient: {
//         paddingVertical: 40,
//         paddingHorizontal: 32,
//         alignItems: 'center',
//     },
//     loadingIconContainer: {
//         marginBottom: 20,
//     },
//     loadingTitle: {
//         fontSize: 22,
//         fontWeight: '700',
//         color: '#fff',
//         marginBottom: 8,
//         textAlign: 'center',
//     },
//     loadingSubtitle: {
//         fontSize: 16,
//         color: 'rgba(255,255,255,0.8)',
//         textAlign: 'center',
//         lineHeight: 22,
//     },
//     contentContainer: {
//         flex: 1,
//         padding: 20,
//         paddingTop: 25,
//     },
//     header: {
//         alignItems: 'center',
//         marginBottom: 24,
//     },
//     headerIconContainer: {
//         borderRadius: 30,
//         overflow: 'hidden',
//         marginBottom: 16,
//     },
//     headerIconGradient: {
//         padding: 16,
//     },
//     title: {
//         fontSize: 32,
//         fontWeight: '800',
//         color: '#fff',
//         textAlign: 'center',
//         marginBottom: 8,
//         textShadowColor: 'rgba(0,0,0,0.3)',
//         textShadowOffset: { width: 0, height: 2 },
//         textShadowRadius: 4,
//     },
//     subtitle: {
//         fontSize: 16,
//         color: 'rgba(255,255,255,0.8)',
//         textAlign: 'center',
//         fontWeight: '500',
//     },
//     statsContainer: {
//         borderRadius: 16,
//         overflow: 'hidden',
//         marginBottom: 24,
//     },
//     statsGradient: {
//         padding: 20,
//     },
//     statsRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     statItem: {
//         alignItems: 'center',
//         flex: 1,
//     },
//     statIconContainer: {
//         marginBottom: 8,
//     },
//     statNumber: {
//         fontSize: 20,
//         fontWeight: '700',
//         color: '#fff',
//         marginBottom: 4,
//     },
//     statLabel: {
//         fontSize: 12,
//         color: 'rgba(255,255,255,0.7)',
//         fontWeight: '500',
//     },
//     statDivider: {
//         width: 1,
//         height: 40,
//         backgroundColor: 'rgba(255,255,255,0.2)',
//         marginHorizontal: 16,
//     },
//     participantsContainer: {
//         flex: 1,
//         marginBottom: 20,
//     },
//     participantsHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 16,
//     },
//     participantsTitle: {
//         fontSize: 20,
//         fontWeight: '700',
//         color: '#fff',
//     },
//     refreshIndicator: {
//         padding: 6,
//     },
//     participantsList: {
//         flex: 1,
//     },
//     listContent: {
//         paddingBottom: 10,
//     },
//     participantCard: {
//         marginBottom: 12,
//         borderRadius: 16,
//         overflow: 'hidden',
//     },
//     participantGradient: {
//         padding: 16,
//     },
//     participantHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     participantAvatar: {
//         borderRadius: 20,
//         overflow: 'hidden',
//         marginRight: 12,
//     },
//     avatarGradient: {
//         width: 40,
//         height: 40,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     participantInfo: {
//         flex: 1,
//     },
//     participantName: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#fff',
//         marginBottom: 2,
//     },
//     participantDept: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.7)',
//         fontWeight: '400',
//     },
//     onlineIndicator: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     onlineDot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//         backgroundColor: '#4CAF50',
//         marginRight: 6,
//     },
//     onlineText: {
//         fontSize: 12,
//         color: 'rgba(255,255,255,0.8)',
//         fontWeight: '500',
//     },
//     emptyContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         borderRadius: 16,
//         overflow: 'hidden',
//     },
//     emptyGradient: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 40,
//         paddingHorizontal: 32,
//     },
//     emptyIconContainer: {
//         marginBottom: 16,
//     },
//     emptyTitle: {
//         fontSize: 18,
//         fontWeight: '600',
//         color: '#fff',
//         marginBottom: 8,
//         textAlign: 'center',
//     },
//     emptyText: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.7)',
//         textAlign: 'center',
//         lineHeight: 20,
//     },
//     bottomContainer: {
//         alignItems: 'center',
//     },
//     readyButton: {
//         width: '100%',
//         borderRadius: 16,
//         overflow: 'hidden',
//         marginBottom: 12,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 8,
//         elevation: 8,
//     },
//     readyButtonGradient: {
//         paddingVertical: 18,
//         paddingHorizontal: 24,
//     },
//     readyButtonContent: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     readyButtonText: {
//         color: '#fff',
//         fontSize: 18,
//         fontWeight: '700',
//         marginLeft: 8,
//     },
//     readyHint: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.6)',
//         textAlign: 'center',
//         fontStyle: 'italic',
//     },
// });


// // import React, { useState, useEffect } from 'react';
// // import { 
// //   View, 
// //   Text, 
// //   StyleSheet, 
// //   ActivityIndicator, 
// //   FlatList,
// //   ImageBackground,
// //   TouchableOpacity
// // } from 'react-native';
// // import api from '../services/api';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import { globalStyles, colors, layout } from '../assets/globalStyles';
// // import Icon from 'react-native-vector-icons/MaterialIcons';

// // export default function LobbyScreen({ navigation, route }) {
// //     const { sessionId } = route.params;
// //     const [participants, setParticipants] = useState([]);
// //     const [loading, setLoading] = useState(true);
// //     const [isReady, setIsReady] = useState(false);


// //     const fetchParticipants = async () => {
// //         try {
// //             const token = await AsyncStorage.getItem('token');
// //             if (!token) {
// //                 throw new Error('No authentication token found');
// //             }

// //             const response = await api.get('/student/session/participants', { 
// //                 params: { session_id: sessionId },
// //                 headers: {
// //                     Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
// //                 },
// //                 validateStatus: function (status) {
// //                     return status === 200 || status === 404;
// //                 }
// //             });
            
// //             if (response.status === 404) {
// //                 setParticipants([]);
// //             } else {
// //                 setParticipants(response.data?.data || []);
// //             }
// //         } catch (error) {
// //             console.error('Error fetching participants:', error);
// //             setParticipants([]);
// //         } finally {
// //             setLoading(false);
// //         }
// //     };

// //     useEffect(() => {
// //         // Initial fetch
// //         fetchParticipants();

// //         // Poll every 5 seconds
// //         const interval = setInterval(fetchParticipants, 5000);

// //         return () => {
// //             clearInterval(interval);
// //         };
// //     }, [sessionId]);

// //     const handleReady = async () => {
// //         try {
// //             setIsReady(true);
// //             const token = await AsyncStorage.getItem('token');
// //             if (!token) {
// //                 throw new Error('No authentication token found');
// //             }

// //             await api.put('/student/session/status', { 
// //                 sessionId, 
// //                 status: 'active'
// //             }, {
// //                 headers: {
// //                     Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
// //                 }
// //             });
            
// //             navigation.replace('GdSession', { sessionId });
// //         } catch (error) {
// //             console.error('Error starting session:', error);
// //             setIsReady(false);
// //         }
// //     };

// //     if (loading) {
// //         return (
// //             <ImageBackground 
// //                 // source={require('../../assets/gd-bg.jpg')} 
// //                 style={styles.container}
// //                 resizeMode="cover"
// //             >
// //                 <View style={styles.loadingOverlay}>
// //                     <ActivityIndicator size="large" color="#4A90E2" />
// //                 </View>
// //             </ImageBackground>
// //         );
// //     }

// //     return (
// //         <ImageBackground 
// //             // source={require('../../assets/gd-bg.jpg')} 
// //             style={styles.container}
// //             resizeMode="cover"
// //         >
// //             <View style={styles.contentContainer}>
// //                 <Text style={styles.title}>Session Lobby</Text>
                
// //                 <View style={styles.participantsContainer}>
// //                     <Text style={styles.subtitle}>Participants ({participants.length}):</Text>
// //                     <FlatList
// //                         data={participants}
// //                         keyExtractor={item => item.id}
// //                         contentContainerStyle={styles.listContent}
// //                         renderItem={({ item }) => (
// //                             <View style={styles.participantCard}>
// //                                 <Text style={styles.participantName}>{item.name}</Text>
// //                                 {item.department && (
// //                                     <Text style={styles.participantDept}>{item.department}</Text>
// //                                 )}
// //                             </View>
// //                         )}
// //                         ListEmptyComponent={
// //                             <Text style={styles.emptyText}>No other participants yet</Text>
// //                         }
// //                     />
// //                 </View>

// //                 <TouchableOpacity 
// //                     style={[styles.readyButton, isReady && styles.readyButtonActive]}
// //                     onPress={handleReady}
// //                     disabled={isReady}
// //                 >
// //                     <Text style={styles.readyButtonText}>
// //                         {isReady ? 'Starting Session...' : 'I\'m Ready'}
// //                     </Text>
// //                 </TouchableOpacity>
// //             </View>
// //         </ImageBackground>
// //     );
// // }

// // const styles = StyleSheet.create({
// //     container: {
// //         flex: 1,
// //     },
// //     contentContainer: {
// //         flex: 1,
// //         padding: 20,
// //         backgroundColor: '#2C6DB4',
// //     },
// //     loadingOverlay: {
// //         flex: 1,
// //         justifyContent: 'center',
// //         alignItems: 'center',
// //         backgroundColor: 'rgba(0,0,0,0.5)',
// //     },
// //     title: {
// //         fontSize: 28,
// //         fontWeight: 'bold',
// //         color: '#FFFFFF',
// //         textAlign: 'center',
// //         marginBottom: 20,
// //         textShadowColor: 'rgba(0,0,0,0.5)',
// //         textShadowOffset: { width: 1, height: 1 },
// //         textShadowRadius: 3,
// //     },
// //     participantsContainer: {
// //         flex: 1,
// //         backgroundColor: 'rgba(255, 255, 255, 0.1)',
// //         borderRadius: 10,
// //         padding: 15,
// //         marginBottom: 20,
// //     },
// //     subtitle: {
// //         fontSize: 18,
// //         color: '#FFFFFF',
// //         marginBottom: 10,
// //         fontWeight: '600',
// //     },
// //     listContent: {
// //         paddingBottom: 10,
// //     },
// //     participantCard: {
// //         backgroundColor: 'rgba(74, 226, 206, 0.2)',
// //         borderRadius: 8,
// //         padding: 15,
// //         marginBottom: 10,
// //         borderWidth: 1,
// //         borderColor: 'rgba(255, 255, 255, 0.5)',
// //     },
// //     participantName: {
// //         fontSize: 16,
// //         color: '#FFFFFF',
// //         fontWeight: '500',
// //     },
// //     participantDept: {
// //         fontSize: 14,
// //         color: '#CCCCCC',
// //         marginTop: 4,
// //     },
// //     emptyText: {
// //         color: '#CCCCCC',
// //         textAlign: 'center',
// //         marginTop: 20,
// //     },
// //     readyButton: {
// //         backgroundColor: '#4A90E2',
// //         padding: 15,
// //         borderRadius: 8,
// //         alignItems: 'center',
// //         justifyContent: 'center',
// //     },
// //     readyButtonActive: {
// //         backgroundColor: '#2C6DB4',
// //     },
// //     readyButtonText: {
// //         color: '#FFFFFF',
// //         fontSize: 18,
// //         fontWeight: 'bold',
// //     },
// // });