import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, Alert, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { globalStyles, colors, layout } from '../assets/globalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import HamburgerHeader from '../components/HamburgerHeader';

export default function WaitingScreen({ navigation, route }) {
    const { sessionId } = route.params;
    const [status, setStatus] = useState({
        allCompleted: false,
        completed: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollingRef = useRef(null);
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [isNavigating, setIsNavigating] = useState(false);
    const [hasNavigatedToResults, setHasNavigatedToResults] = useState(false);
    const navigationLockRef = useRef(false); // Use ref for navigation lock

    const checkCompletionStatus = async () => {
        // Prevent multiple navigation attempts using ref for immediate access
        if (isNavigating || navigationLockRef.current) return;
        
        try {
            const response = await api.student.checkSurveyCompletion(sessionId);
            
            console.log('Completion check response:', response.data);
            
            if (response.data) {
                const responseData = response.data;
                
                // Handle different response structures
                const completed = Number(responseData.completed) || Number(responseData.data?.completed) || 0;
                const total = Number(responseData.total) || Number(responseData.data?.total) || 0;
                
                console.log('Completion status - Completed:', completed, 'Total:', total);
                
                // Wait for ALL participants to complete
                const allCompletedNow = completed >= total && total > 0;
                
                setStatus({
                    allCompleted: allCompletedNow,
                    completed,
                    total
                });
                setLastUpdate(Date.now());

                // Only navigate when ALL participants have completed AND we're not already navigating
                if (allCompletedNow && !isNavigating && !navigationLockRef.current) {
                    setIsNavigating(true);
                    navigationLockRef.current = true; // Lock navigation immediately
                    setHasNavigatedToResults(true);
                    console.log('ALL participants completed, navigating to Results');
                    clearInterval(pollingRef.current);
                    
                    // Use a small timeout to ensure the navigation lock is set
                    setTimeout(() => {
                        navigation.replace('Results', { sessionId });
                    }, 100);
                }
            }
        } catch (err) {
            console.error('Completion check error:', err);
            setError('Failed to check completion status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check if we're coming back to Waiting after already navigating to Results
        const unsubscribe = navigation.addListener('focus', () => {
            // If we've already navigated to Results but somehow came back to Waiting,
            // immediately navigate back to Results and stop polling
            if (hasNavigatedToResults || navigationLockRef.current) {
                clearInterval(pollingRef.current);
                navigation.replace('Results', { sessionId });
            }
        });

        return unsubscribe;
    }, [navigation, sessionId, hasNavigatedToResults]);

    useEffect(() => {
        // Clear navigation lock when component unmounts
        return () => {
            navigationLockRef.current = false;
        };
    }, []);

    useEffect(() => {
        // Initial check
        checkCompletionStatus();

        // Start polling every 3 seconds
        pollingRef.current = setInterval(checkCompletionStatus, 3000);

        // Handle back button
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                Alert.alert(
                    "Waiting for Results",
                    "Are you sure you want to leave? You won't see the results if you exit now.",
                    [
                        { text: "Cancel", onPress: () => null },
                        { text: "Exit", onPress: () => {
                            clearInterval(pollingRef.current);
                            navigation.goBack();
                        }}
                    ]
                );
                return true;
            }
        );

        return () => {
            clearInterval(pollingRef.current);
            backHandler.remove();
            navigationLockRef.current = false; // Clean up navigation lock
        };
    }, [sessionId]);

    if (loading) {
        return (
            <LinearGradient
                colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                style={styles.container}
            >
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCard}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                            style={styles.loadingCardGradient}
                        >
                            <View style={styles.loadingIconContainer}>
                                <ActivityIndicator size="large" color="#64ffda" />
                            </View>
                            <Text style={styles.loadingTitle}>Checking Status</Text>
                            <Text style={styles.loadingSubtitle}>Checking survey completion status...</Text>
                        </LinearGradient>
                    </View>
                </View>
            </LinearGradient>
        );
    }

    if (error) {
        return (
            <LinearGradient
                colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                style={styles.container}
            >
                <View style={styles.errorContainer}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={styles.errorCard}
                    >
                        <View style={styles.errorIconContainer}>
                            <Icon name="error-outline" size={64} color="#ff5252" />
                        </View>
                        <Text style={styles.errorTitle}>Connection Issue</Text>
                        <Text style={styles.errorSubtitle}>{error}</Text>
                        <Text style={styles.retryText}>Will retry automatically...</Text>
                        <Text style={styles.timestamp}>
                            Last update: {new Date(lastUpdate).toLocaleTimeString()}
                        </Text>
                    </LinearGradient>
                </View>
            </LinearGradient>
        );
    }

    return (
        
        <LinearGradient
            colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
            style={styles.container}
        > 
        <HamburgerHeader title="Waiting Lobby" />
            <View style={styles.contentContainer}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerIconContainer}>
                        <LinearGradient
                            colors={['rgba(100,255,218,0.2)', 'rgba(100,255,218,0.1)']}
                            style={styles.headerIconGradient}
                        >
                            <Icon name="hourglass-empty" size={32} color="#64ffda" />
                        </LinearGradient>
                    </View>
                    <Text style={styles.title}>Waiting for Others</Text>
                    <Text style={styles.subtitle}>Please wait while others complete their surveys</Text>
                </View>

                {/* Progress Section */}
                <View style={styles.progressCard}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.progressGradient}
                    >
                        <View style={styles.progressHeader}>
                            <Icon name="people" size={24} color="#64ffda" />
                            <Text style={styles.progressLabel}>Survey Progress</Text>
                        </View>
                        
                        <View style={styles.progressStats}>
                            <View style={styles.completedContainer}>
                                <Text style={styles.completedNumber}>{status.completed}</Text>
                                <Text style={styles.completedLabel}>Completed</Text>
                            </View>
                            <View style={styles.progressDivider}>
                                <Text style={styles.dividerText}>of</Text>
                            </View>
                            <View style={styles.totalContainer}>
                                <Text style={styles.totalNumber}>{status.total}</Text>
                                <Text style={styles.totalLabel}>Total</Text>
                            </View>
                        </View>

                        {status.total > 0 && (
                            <View style={styles.progressBarContainer}>
                                <View style={styles.progressBarBackground}>
                                    <LinearGradient
                                        colors={['#64ffda', '#00bcd4']}
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${(status.completed / status.total) * 100}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressPercentage}>
                                    {Math.round((status.completed / status.total) * 100)}%
                                </Text>
                            </View>
                        )}

                        {status.total > status.completed && (
                            <Text style={styles.remainingText}>
                                {status.total - status.completed} participants still completing
                            </Text>
                        )}
                    </LinearGradient>
                </View>

                {/* Loading Animation Section */}
                <View style={styles.loadingSection}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                        style={styles.loadingAnimationContainer}
                    >
                        <ActivityIndicator size="large" color="#64ffda" style={styles.spinner} />
                        <Text style={styles.waitingText}>Processing surveys...</Text>
                    </LinearGradient>
                </View>

                {/* Status Section */}
                <View style={styles.statusContainer}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
                        style={styles.statusGradient}
                    >
                        <View style={styles.statusRow}>
                            <Icon name="info-outline" size={20} color="#64ffda" />
                            <Text style={styles.note}>
                                Results will appear automatically when everyone finishes
                            </Text>
                        </View>
                        <View style={styles.timestampContainer}>
                            <Icon name="access-time" size={16} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.timestamp}>
                                Last checked: {new Date(lastUpdate).toLocaleTimeString()}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingCard: {
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    loadingCardGradient: {
        paddingVertical: 40,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    loadingIconContainer: {
        marginBottom: 20,
    },
    loadingTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 22,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorCard: {
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,82,82,0.3)',
    },
    errorIconContainer: {
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    retryText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 50,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    headerIconContainer: {
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(100,255,218,0.3)',
    },
    headerIconGradient: {
        padding: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontWeight: '500',
    },
    progressCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    progressGradient: {
        padding: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    progressLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginLeft: 12,
    },
    progressStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    completedContainer: {
        alignItems: 'center',
        flex: 1,
    },
    completedNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: '#64ffda',
    },
    completedLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    progressDivider: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    dividerText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
    },
    totalContainer: {
        alignItems: 'center',
        flex: 1,
    },
    totalNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
    },
    totalLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    progressBarContainer: {
        marginBottom: 16,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressPercentage: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
    },
    remainingText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    loadingSection: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    loadingAnimationContainer: {
        padding: 32,
        alignItems: 'center',
    },
    spinner: {
        marginBottom: 16,
    },
    waitingText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    statusContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statusGradient: {
        padding: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    note: {
        flex: 1,
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 12,
        lineHeight: 20,
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timestamp: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginLeft: 6,
    },
});





// import React, { useState, useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, ActivityIndicator, BackHandler, Alert, TouchableOpacity } from 'react-native';
// import api from '../services/api';
// import { globalStyles, colors, layout } from '../assets/globalStyles';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import HamburgerHeader from '../components/HamburgerHeader';
// export default function WaitingScreen({ navigation, route }) {
//     const { sessionId } = route.params;
//     const [status, setStatus] = useState({
//         allCompleted: false,
//         completed: 0,
//         total: 0
//     });
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const pollingRef = useRef(null);
//     const [lastUpdate, setLastUpdate] = useState(Date.now());

// const checkCompletionStatus = async () => {
//     try {
//         const response = await api.student.checkSurveyCompletion(sessionId);
        
//         if (response.data) {
//             const completed = Number(response.data.completed) || 0;
//             const total = Number(response.data.total) || 0;
            
//             // Minimum 2 participants required (excluding self)
//             const hasEnoughParticipants = total >= 2;
            
//             setStatus({
//                 allCompleted: hasEnoughParticipants && (completed >= total),
//                 completed,
//                 total
//             });
//             setLastUpdate(Date.now());

//             if (hasEnoughParticipants && completed >= total) {
//                 clearInterval(pollingRef.current);
//                 navigation.replace('Results', { sessionId });
//             }
//         }
//     } catch (err) {
//         console.error('Completion check error:', err);
//         setError('Failed to check completion status');
//     } finally {
//         setLoading(false);
//     }
// };

//     useEffect(() => {
//         // Initial check
//         checkCompletionStatus();

//         // Start polling every 3 seconds
//         pollingRef.current = setInterval(checkCompletionStatus, 3000);

//         // Handle back button
//         const backHandler = BackHandler.addEventListener(
//             'hardwareBackPress',
//             () => {
//                 Alert.alert(
//                     "Waiting for Results",
//                     "Are you sure you want to leave? You won't see the results if you exit now.",
//                     [
//                         { text: "Cancel", onPress: () => null },
//                         { text: "Exit", onPress: () => navigation.goBack() }
//                     ]
//                 );
//                 return true;
//             }
//         );

//         return () => {
//             clearInterval(pollingRef.current);
//             backHandler.remove();
//         };
//     }, [sessionId]);

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
//                             <Text style={styles.loadingTitle}>Checking Status</Text>
//                             <Text style={styles.loadingSubtitle}>Checking survey completion status...</Text>
//                         </LinearGradient>
//                     </View>
//                 </View>
//             </LinearGradient>
//         );
//     }

//     if (error) {
//         return (
//             <LinearGradient
//                 colors={['#667eea', '#764ba2', '#667eea']}
//                 style={styles.container}
//             >
//                 <View style={styles.errorContainer}>
//                     <LinearGradient
//                         colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//                         style={styles.errorCard}
//                     >
//                         <View style={styles.errorIconContainer}>
//                             <Icon name="error-outline" size={64} color="rgba(255,255,255,0.8)" />
//                         </View>
//                         <Text style={styles.errorTitle}>Connection Issue</Text>
//                         <Text style={styles.errorSubtitle}>{error}</Text>
//                         <Text style={styles.retryText}>Will retry automatically...</Text>
//                         <Text style={styles.timestamp}>
//                             Last update: {new Date(lastUpdate).toLocaleTimeString()}
//                         </Text>
//                     </LinearGradient>
//                 </View>
//             </LinearGradient>
//         );
//     }

//     return (
        
//         <LinearGradient
//             colors={['#667eea', '#764ba2', '#667eea']}
//             style={styles.container}
//         > 
//         <HamburgerHeader title="Waiting Lobby" />
//             <View style={styles.contentContainer}>
//                 {/* Header Section */}
//                 <View style={styles.header}>
//                     <View style={styles.headerIconContainer}>
//                         <LinearGradient
//                             colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
//                             style={styles.headerIconGradient}
//                         >
//                             <Icon name="hourglass-empty" size={32} color="#fff" />
//                         </LinearGradient>
//                     </View>
//                     <Text style={styles.title}>Waiting for Others</Text>
//                     <Text style={styles.subtitle}>Please wait while others complete their surveys</Text>
//                 </View>

//                 {/* Progress Section */}
//                 <View style={styles.progressCard}>
//                     <LinearGradient
//                         colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//                         start={{x: 0, y: 0}}
//                         end={{x: 1, y: 1}}
//                         style={styles.progressGradient}
//                     >
//                         <View style={styles.progressHeader}>
//                             <Icon name="people" size={24} color="#4CAF50" />
//                             <Text style={styles.progressLabel}>Survey Progress</Text>
//                         </View>
                        
//                         <View style={styles.progressStats}>
//                             <View style={styles.completedContainer}>
//                                 <Text style={styles.completedNumber}>{status.completed}</Text>
//                                 <Text style={styles.completedLabel}>Completed</Text>
//                             </View>
//                             <View style={styles.progressDivider}>
//                                 <Text style={styles.dividerText}>of</Text>
//                             </View>
//                             <View style={styles.totalContainer}>
//                                 <Text style={styles.totalNumber}>{status.total}</Text>
//                                 <Text style={styles.totalLabel}>Total</Text>
//                             </View>
//                         </View>

//                         {status.total > 0 && (
//                             <View style={styles.progressBarContainer}>
//                                 <View style={styles.progressBarBackground}>
//                                     <LinearGradient
//                                         colors={['#4CAF50', '#43A047']}
//                                         style={[
//                                             styles.progressBarFill,
//                                             { width: `${(status.completed / status.total) * 100}%` }
//                                         ]}
//                                     />
//                                 </View>
//                                 <Text style={styles.progressPercentage}>
//                                     {Math.round((status.completed / status.total) * 100)}%
//                                 </Text>
//                             </View>
//                         )}

//                         {status.total > status.completed && (
//                             <Text style={styles.remainingText}>
//                                 {status.total - status.completed} participants still completing
//                             </Text>
//                         )}
//                     </LinearGradient>
//                 </View>

//                 {/* Loading Animation Section */}
//                 <View style={styles.loadingSection}>
//                     <LinearGradient
//                         colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//                         style={styles.loadingAnimationContainer}
//                     >
//                         <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
//                         <Text style={styles.waitingText}>Processing surveys...</Text>
//                     </LinearGradient>
//                 </View>

//                 {/* Status Section */}
//                 <View style={styles.statusContainer}>
//                     <LinearGradient
//                         colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
//                         style={styles.statusGradient}
//                     >
//                         <View style={styles.statusRow}>
//                             <Icon name="info-outline" size={20} color="rgba(255,255,255,0.8)" />
//                             <Text style={styles.note}>
//                                 Results will appear automatically when everyone finishes
//                             </Text>
//                         </View>
//                         <View style={styles.timestampContainer}>
//                             <Icon name="access-time" size={16} color="rgba(255,255,255,0.6)" />
//                             <Text style={styles.timestamp}>
//                                 Last checked: {new Date(lastUpdate).toLocaleTimeString()}
//                             </Text>
//                         </View>
//                     </LinearGradient>
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
//     errorContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingHorizontal: 40,
//     },
//     errorCard: {
//         borderRadius: 20,
//         padding: 40,
//         alignItems: 'center',
//         width: '100%',
//     },
//     errorIconContainer: {
//         marginBottom: 20,
//     },
//     errorTitle: {
//         fontSize: 24,
//         fontWeight: '700',
//         color: '#fff',
//         marginBottom: 8,
//         textAlign: 'center',
//     },
//     errorSubtitle: {
//         fontSize: 16,
//         color: 'rgba(255,255,255,0.8)',
//         textAlign: 'center',
//         marginBottom: 16,
//         lineHeight: 22,
//     },
//     retryText: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.7)',
//         textAlign: 'center',
//         marginBottom: 12,
//         fontStyle: 'italic',
//     },
//     contentContainer: {
//         flex: 1,
//         padding: 20,
//         paddingTop: 50,
//     },
//     header: {
//         alignItems: 'center',
//         marginBottom: 32,
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
//     progressCard: {
//         borderRadius: 20,
//         overflow: 'hidden',
//         marginBottom: 24,
//     },
//     progressGradient: {
//         padding: 24,
//     },
//     progressHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 20,
//     },
//     progressLabel: {
//         fontSize: 20,
//         fontWeight: '700',
//         color: '#fff',
//         marginLeft: 12,
//     },
//     progressStats: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginBottom: 20,
//     },
//     completedContainer: {
//         alignItems: 'center',
//         flex: 1,
//     },
//     completedNumber: {
//         fontSize: 32,
//         fontWeight: '800',
//         color: '#4CAF50',
//     },
//     completedLabel: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.8)',
//         fontWeight: '500',
//     },
//     progressDivider: {
//         alignItems: 'center',
//         paddingHorizontal: 20,
//     },
//     dividerText: {
//         fontSize: 16,
//         color: 'rgba(255,255,255,0.6)',
//         fontWeight: '500',
//     },
//     totalContainer: {
//         alignItems: 'center',
//         flex: 1,
//     },
//     totalNumber: {
//         fontSize: 32,
//         fontWeight: '800',
//         color: '#fff',
//     },
//     totalLabel: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.8)',
//         fontWeight: '500',
//     },
//     progressBarContainer: {
//         marginBottom: 16,
//     },
//     progressBarBackground: {
//         height: 8,
//         backgroundColor: 'rgba(255,255,255,0.2)',
//         borderRadius: 4,
//         overflow: 'hidden',
//         marginBottom: 8,
//     },
//     progressBarFill: {
//         height: '100%',
//         borderRadius: 4,
//     },
//     progressPercentage: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#fff',
//         textAlign: 'center',
//     },
//     remainingText: {
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.7)',
//         textAlign: 'center',
//         fontStyle: 'italic',
//     },
//     loadingSection: {
//         borderRadius: 16,
//         overflow: 'hidden',
//         marginBottom: 24,
//     },
//     loadingAnimationContainer: {
//         padding: 32,
//         alignItems: 'center',
//     },
//     spinner: {
//         marginBottom: 16,
//     },
//     waitingText: {
//         fontSize: 16,
//         color: 'rgba(255,255,255,0.8)',
//         fontWeight: '500',
//     },
//     statusContainer: {
//         borderRadius: 12,
//         overflow: 'hidden',
//     },
//     statusGradient: {
//         padding: 16,
//     },
//     statusRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 12,
//     },
//     note: {
//         flex: 1,
//         fontSize: 14,
//         color: 'rgba(255,255,255,0.8)',
//         marginLeft: 12,
//         lineHeight: 20,
//     },
//     timestampContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     timestamp: {
//         fontSize: 12,
//         color: 'rgba(255,255,255,0.6)',
//         marginLeft: 6,
//     },
// });