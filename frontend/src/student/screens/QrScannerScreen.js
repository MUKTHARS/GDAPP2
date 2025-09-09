import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import auth from '../services/auth';
import api from '../services/api';
import { useIsFocused } from '@react-navigation/native';
import HamburgerHeader from '../components/HamburgerHeader';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function QrScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
   const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const camera = useRef(null);
  const device = useCameraDevice('back');
  const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
const [studentLevel, setStudentLevel] = useState(null);
   useEffect(() => {
      fetchStudentLevel();
        checkActiveBooking();
    }, []);

const fetchStudentLevel = async () => {
    try {
        const authData = await auth.getAuthData();
        const profileResponse = await api.student.getProfile();
        
        if (profileResponse.data?.current_gd_level) {
            setStudentLevel(profileResponse.data.current_gd_level);
        } else {
            // Fallback: try to get level from auth data or other sources
            const level = authData?.level || 1;
            setStudentLevel(level);
        }
    } catch (error) {
        console.error('Error fetching student level:', error);
        setStudentLevel(1); // Default to level 1 if unable to fetch
    }
};

    const checkActiveBooking = async () => {
        try {
            const authData = await auth.getAuthData();
            const bookingsResponse = await api.student.getUserBookings();
            
            // Check if user has any active bookings
            const hasBooking = Array.isArray(bookingsResponse.data) && 
                              bookingsResponse.data.length > 0;
            
            setHasActiveBooking(hasBooking);
            
            if (!hasBooking) {
                setError('You must book a venue before scanning QR code');
                setIsActive(false);
            }
        } catch (error) {
            console.error('Error checking active booking:', error);
            setError('Unable to verify booking status');
            setIsActive(false);
        }
    };


   const codeScanner = useCodeScanner({
        codeTypes: ['qr'],

       onCodeScanned: async (codes) => {
    if (codes.length > 0 && isActive && isFocused && hasActiveBooking && studentLevel !== null) {
        setIsActive(false);
        setIsScanning(true);
        const qrData = codes[0].value;
        
        try {
            // Parse QR data to get venue level
            let qrVenueLevel = null;
            try {
                const qrPayload = JSON.parse(qrData);
                  if (qrPayload.level && qrPayload.level !== studentLevel) {
        throw new Error(`This QR code is for Level ${qrPayload.level} venues, but your current level is ${studentLevel}. Please book a Level ${studentLevel} venue first.`);
    }
            } catch (parseError) {
                console.log('QR data is not JSON format');
            }
            
            const authData = await auth.getAuthData();
            
            if (!authData?.token) {
                throw new Error('Authentication required - please login again');
            }

            const response = await api.student.joinSession({ qr_data: qrData });

            if (response?.data?.error) {
                // Check if it's a level mismatch error
                if (response.data.error.includes('current level')) {
                    throw new Error(`Level restriction: ${response.data.error}. Your current level is ${studentLevel}`);
                }
                throw new Error(response.data.error);
            }

            if (!response?.data?.session_id) {
                throw new Error('Failed to join session - invalid response');
            }

            // Navigate to lobby instead of directly to session
            navigation.navigate('Lobby', { 
                sessionId: response.data.session_id 
            });
            
        } catch (error) {
            console.error('QR Scan Error:', error);
            setIsActive(true);
            setIsScanning(false);
            
            // Show specific error message for level mismatches
            let errorMessage = error.message || 'Failed to join session';
            if (errorMessage.includes('Level restriction')) {
                errorMessage = `${errorMessage}\n\nPlease book a venue for your current level (Level ${studentLevel}) first.`;
            }
            
            Alert.alert(
                'Session Error',
                errorMessage,
                [{ 
                    text: 'OK', 
                    onPress: () => {
                        setIsActive(true);
                        setIsScanning(false);
                    }
                }]
            );
        }
    }
}
  });

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs access to your camera",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        if (!cameraPermission) {
          const permission = await requestPermission();
          setHasPermission(permission);
        } else {
          setHasPermission(true);
        }
      }
    };
    requestCameraPermission();
  }, [cameraPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <Icon name="camera-alt" size={64} color="#64748B" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtitle}>
            We need camera permission to scan QR codes and help you join sessions
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.CAMERA
                );
                setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
              } else {
                const permission = await requestPermission();
                setHasPermission(permission);
              }
            }}
          >
            <Icon name="camera" size={18} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <Icon name="camera-off" size={64} color="#64748B" />
          </View>
          <Text style={styles.permissionTitle}>Camera Not Available</Text>
          <Text style={styles.permissionSubtitle}>
            Unable to access camera device. Please check your device settings.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
       {!hasActiveBooking && error && (
                <View style={styles.bookingErrorContainer}>
                    <View style={styles.bookingErrorContent}>
                        <Icon name="event-busy" size={48} color="#EF4444" />
                        <Text style={styles.bookingErrorTitle}>No Active Booking</Text>
                        <Text style={styles.bookingErrorText}>
                            You need to book a venue before scanning QR codes
                        </Text>
                        <TouchableOpacity
                            style={styles.bookingErrorButton}
                            onPress={() => navigation.navigate('SessionBooking')}
                        >
                            <Icon name="event-available" size={18} color="#fff" />
                            <Text style={styles.bookingErrorButtonText}>Book Venue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Only show camera if user has active booking */}
            {hasActiveBooking && device && (
                <Camera
                    ref={camera}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isActive && isFocused}
                    codeScanner={codeScanner}
                    torch={'off'}
                    zoom={1}
                />
            )}

      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && isFocused}
        codeScanner={codeScanner}
        torch={'off'}
        zoom={1}
      />

      <View style={styles.overlay}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            {/* Corner Borders */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {/* Scanning Animation */}
            {isScanning && (
              <View style={styles.scanningOverlay}>
                <View style={styles.scanningLine} />
              </View>
            )}
            
            {/* QR Icon in center when not scanning */}
            {!isScanning && (
              <View style={styles.qrIconContainer}>
                <Icon name="qr-code-scanner" size={48} color="rgba(248,250,252,0.6)" />
              </View>
            )}
          </View>
          
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionTitle}>
              {isScanning ? 'Processing...' : 'Position QR Code'}
            </Text>
            <Text style={styles.instructionText}>
              {isScanning ? 'Please wait while we process the QR code' : 'Align the QR code within the frame to scan'}
            </Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={18} color="#F8FAFC" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, isActive ? styles.pauseButton : styles.resumeButton]}
            onPress={() => {
              setIsActive(!isActive);
            }}
          >
            <Icon name={isActive ? "pause" : "play-arrow"} size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {isActive ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorContent}>
              <Icon name="error-outline" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setIsActive(true);
                  setIsScanning(false);
                }}
              >
                <Icon name="refresh" size={16} color="#4F46E5" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#030508ff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionContent: {
    alignItems: 'center',
    width: '100%',
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#090d13ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(30,41,59,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSpacer: {
    width: 44,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#4F46E5',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  scanningLine: {
    height: 3,
    width: '100%',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  qrIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    marginTop: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.3)',
  },
  instructionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  instructionText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(15,23,42,0.9)',
    paddingTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.48,
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  pauseButton: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  resumeButton: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  actionButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: '#090d13ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F8FAFC',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d13ff',
    borderColor: '#4F46E5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
    bookingErrorContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    bookingErrorContent: {
        backgroundColor: '#1F2937',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        width: '80%',
    },
    bookingErrorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginTop: 16,
        marginBottom: 8,
    },
    bookingErrorText: {
        fontSize: 16,
        color: '#CBD5E1',
        textAlign: 'center',
        marginBottom: 24,
    },
    bookingErrorButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bookingErrorButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});


// import React, { useState, useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
// import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
// import auth from '../services/auth';
// import api from '../services/api';
// import { useIsFocused } from '@react-navigation/native';
// import HamburgerHeader from '../components/HamburgerHeader';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';

// export default function QrScannerScreen({ navigation }) {
//   const [hasPermission, setHasPermission] = useState(false);
//   const [isActive, setIsActive] = useState(true);
//   const [error, setError] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);
//   const camera = useRef(null);
//   const device = useCameraDevice('back');
//   const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();
//   const isFocused = useIsFocused();

//   const codeScanner = useCodeScanner({
//     codeTypes: ['qr'],

//  onCodeScanned: async (codes) => {
//             if (codes.length > 0 && isActive && isFocused) {
//                 setIsActive(false);
//                 setIsScanning(true);
//                 const qrData = codes[0].value;
                
//                 try {
//                     const authData = await auth.getAuthData();
                    
//                     if (!authData?.token) {
//                         throw new Error('Authentication required - please login again');
//                     }

//                     const response = await api.student.joinSession({ qr_data: qrData });

//                     if (response?.data?.error) {
//                         throw new Error(response.data.error);
//                     }

//                     if (!response?.data?.session_id) {
//                         throw new Error('Failed to join session - invalid response');
//                     }

//                     // Navigate to lobby instead of directly to session
//                     navigation.navigate('Lobby', { 
//                         sessionId: response.data.session_id 
//                     });
                    
//                 } catch (error) {
//                     console.error('QR Scan Error:', error);
//                     setIsActive(true);
//                     setIsScanning(false);
//                     Alert.alert(
//                         'Session Error',
//                         error.message || 'Failed to join session',
//                         [{ 
//                             text: 'OK', 
//                             onPress: () => {
//                                 setIsActive(true);
//                                 setIsScanning(false);
//                             }
//                         }]
//                     );
//                 }
//             }
//         }

//   });

//   useEffect(() => {
//     const requestCameraPermission = async () => {
//       if (Platform.OS === 'android') {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.CAMERA,
//           {
//             title: "Camera Permission",
//             message: "App needs access to your camera",
//             buttonNeutral: "Ask Me Later",
//             buttonNegative: "Cancel",
//             buttonPositive: "OK"
//           }
//         );
//         setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
//       } else {
//         if (!cameraPermission) {
//           const permission = await requestPermission();
//           setHasPermission(permission);
//         } else {
//           setHasPermission(true);
//         }
//       }
//     };
//     requestCameraPermission();
//   }, [cameraPermission]);

//   if (!hasPermission) {
//     return (
//       <View style={styles.permissionContainer}>
//         <LinearGradient
//           colors={['#667eea', '#764ba2']}
//           style={styles.permissionGradient}
//         >
//           <View style={styles.permissionContent}>
//             <View style={styles.permissionIconContainer}>
//               <Icon name="camera-alt" size={80} color="rgba(255,255,255,0.8)" />
//             </View>
//             <Text style={styles.permissionTitle}>Camera Access Required</Text>
//             <Text style={styles.permissionSubtitle}>
//               We need camera permission to scan QR codes and help you join sessions
//             </Text>
//             <TouchableOpacity
//               style={styles.permissionButton}
//               onPress={async () => {
//                 if (Platform.OS === 'android') {
//                   const granted = await PermissionsAndroid.request(
//                     PermissionsAndroid.PERMISSIONS.CAMERA
//                   );
//                   setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
//                 } else {
//                   const permission = await requestPermission();
//                   setHasPermission(permission);
//                 }
//               }}
//             >
//               <LinearGradient
//                 colors={['#4CAF50', '#43A047']}
//                 style={styles.permissionButtonGradient}
//               >
//                 <Icon name="camera" size={20} color="#fff" />
//                 <Text style={styles.permissionButtonText}>Grant Permission</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </View>
//         </LinearGradient>
//       </View>
//     );
//   }

//   if (!device) {
//     return (
//       <View style={styles.permissionContainer}>
//         <LinearGradient
//           colors={['#667eea', '#764ba2']}
//           style={styles.permissionGradient}
//         >
//           <View style={styles.permissionContent}>
//             <View style={styles.permissionIconContainer}>
//               <Icon name="camera-off" size={80} color="rgba(255,255,255,0.8)" />
//             </View>
//             <Text style={styles.permissionTitle}>Camera Not Available</Text>
//             <Text style={styles.permissionSubtitle}>
//               Unable to access camera device. Please check your device settings.
//             </Text>
//           </View>
//         </LinearGradient>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* <HamburgerHeader title="Scan QR Code" /> */}
//       <Camera
//         ref={camera}
//         style={StyleSheet.absoluteFill}
//         device={device}
//         isActive={isActive && isFocused}
//         codeScanner={codeScanner}
//         torch={'off'}
//         zoom={1}
//       />

//       <View style={styles.overlay}>
//         {/* Header Section */}
//         <View style={styles.header}>
//           <TouchableOpacity 
//             style={styles.backButton}
//             onPress={() => navigation.goBack()}
//           >
//             {/* <LinearGradient
//               colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
//               style={styles.backButtonGradient}
//             >
//               <Icon name="arrow-back" size={24} color="#fff" />
//             </LinearGradient> */}
//           </TouchableOpacity>
//           <View style={styles.headerSpacer} />
//         </View>

//         {/* Scanner Area */}
//         <View style={styles.scannerContainer}>
//           <View style={styles.scannerFrame}>
//             {/* Corner Borders */}
//             <View style={[styles.corner, styles.topLeft]} />
//             <View style={[styles.corner, styles.topRight]} />
//             <View style={[styles.corner, styles.bottomLeft]} />
//             <View style={[styles.corner, styles.bottomRight]} />
            
//             {/* Scanning Animation */}
//             {isScanning && (
//               <View style={styles.scanningOverlay}>
//                 <LinearGradient
//                   colors={['transparent', '#4CAF50', 'transparent']}
//                   start={{x: 0, y: 0}}
//                   end={{x: 0, y: 1}}
//                   style={styles.scanningLine}
//                 />
//               </View>
//             )}
            
//             {/* QR Icon in center when not scanning */}
//             {!isScanning && (
//               <View style={styles.qrIconContainer}>
//                 <Icon name="qr-code-scanner" size={60} color="rgba(255,255,255,0.6)" />
//               </View>
//             )}
//           </View>
          
//           <View style={styles.instructionContainer}>
//             <Text style={styles.instructionTitle}>
//               {isScanning ? 'Processing...' : 'Position QR Code'}
//             </Text>
//             <Text style={styles.instructionText}>
//               {isScanning ? 'Please wait while we process the QR code' : 'Align the QR code within the frame to scan'}
//             </Text>
//           </View>
//         </View>

//         {/* Bottom Actions */}
//         <View style={styles.bottomActions}>
//           <TouchableOpacity
//             style={styles.actionButton}
//             onPress={() => navigation.goBack()}
//           >
//             <LinearGradient
//               colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//               style={styles.actionButtonGradient}
//             >
//               <Icon name="close" size={20} color="#fff" />
//               <Text style={styles.actionButtonText}>Cancel</Text>
//             </LinearGradient>
//           </TouchableOpacity>
          
//           <TouchableOpacity
//             style={styles.actionButton}
//             onPress={() => {
//               setIsActive(!isActive);
//             }}
//           >
//             <LinearGradient
//               colors={isActive ? ['#F44336', '#E53935'] : ['#4CAF50', '#43A047']}
//               style={styles.actionButtonGradient}
//             >
//               <Icon name={isActive ? "pause" : "play-arrow"} size={20} color="#fff" />
//               <Text style={styles.actionButtonText}>
//                 {isActive ? 'Pause' : 'Resume'}
//               </Text>
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>

//         {/* Error Display */}
//         {error && (
//           <View style={styles.errorContainer}>
//             <LinearGradient
//               colors={['rgba(244,67,54,0.9)', 'rgba(229,57,53,0.9)']}
//               style={styles.errorGradient}
//             >
//               <View style={styles.errorContent}>
//                 <Icon name="error-outline" size={24} color="#fff" />
//                 <Text style={styles.errorText}>{error}</Text>
//                 <TouchableOpacity
//                   style={styles.retryButton}
//                   onPress={() => {
//                     setError(null);
//                     setIsActive(true);
//                     setIsScanning(false);
//                   }}
//                 >
//                   <View style={styles.retryButtonInner}>
//                     <Icon name="refresh" size={18} color="#F44336" />
//                     <Text style={styles.retryButtonText}>Try Again</Text>
//                   </View>
//                 </TouchableOpacity>
//               </View>
//             </LinearGradient>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//   },
//   permissionContainer: {
//     flex: 1,
//   },
//   permissionGradient: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   permissionContent: {
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   permissionIconContainer: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   permissionTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   permissionSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     lineHeight: 24,
//     marginBottom: 32,
//   },
//   permissionButton: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     width: '100%',
//   },
//   permissionButtonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//   },
//   permissionButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'space-between',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 50,
//     paddingBottom: 20,
//   },
//   backButton: {
//     borderRadius: 20,
//     overflow: 'hidden',
//   },
//   backButtonGradient: {
//     padding: 12,
//   },
//   headerTitle: {
//     flex: 1,
//     textAlign: 'center',
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   headerSpacer: {
//     width: 48,
//   },
//   scannerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   scannerFrame: {
//     width: 280,
//     height: 280,
//     position: 'relative',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   corner: {
//     position: 'absolute',
//     width: 30,
//     height: 30,
//     borderColor: '#fff',
//   },
//   topLeft: {
//     top: 0,
//     left: 0,
//     borderTopWidth: 4,
//     borderLeftWidth: 4,
//     borderTopLeftRadius: 8,
//   },
//   topRight: {
//     top: 0,
//     right: 0,
//     borderTopWidth: 4,
//     borderRightWidth: 4,
//     borderTopRightRadius: 8,
//   },
//   bottomLeft: {
//     bottom: 0,
//     left: 0,
//     borderBottomWidth: 4,
//     borderLeftWidth: 4,
//     borderBottomLeftRadius: 8,
//   },
//   bottomRight: {
//     bottom: 0,
//     right: 0,
//     borderBottomWidth: 4,
//     borderRightWidth: 4,
//     borderBottomRightRadius: 8,
//   },
//   scanningOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//   },
//   scanningLine: {
//     height: 4,
//     width: '100%',
//   },
//   qrIconContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   instructionContainer: {
//     marginTop: 40,
//     alignItems: 'center',
//   },
//   instructionTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   instructionText: {
//     color: 'rgba(255,255,255,0.7)',
//     fontSize: 14,
//     textAlign: 'center',
//     lineHeight: 20,
//     paddingHorizontal: 20,
//   },
//   bottomActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 40,
//     paddingBottom: 50,
//   },
//   actionButton: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     flex: 0.45,
//   },
//   actionButtonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//     marginLeft: 6,
//   },
//   errorContainer: {
//     position: 'absolute',
//     bottom: 120,
//     left: 20,
//     right: 20,
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   errorGradient: {
//     padding: 20,
//   },
//   errorContent: {
//     alignItems: 'center',
//   },
//   errorText: {
//     color: '#fff',
//     fontSize: 16,
//     textAlign: 'center',
//     marginVertical: 12,
//     lineHeight: 22,
//   },
//   retryButton: {
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     overflow: 'hidden',
//     marginTop: 8,
//   },
//   retryButtonInner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//   },
//   retryButtonText: {
//     color: '#F44336',
//     fontSize: 14,
//     fontWeight: '600',
//     marginLeft: 6,
//   },
// });


// // import React, { useState, useEffect, useRef } from 'react';
// // import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
// // import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
// // import auth from '../services/auth';
// // import api from '../services/api';
// // import { useIsFocused } from '@react-navigation/native';
// // import HamburgerHeader from '../components/HamburgerHeader';

// // export default function QrScannerScreen({ navigation }) {
// //   const [hasPermission, setHasPermission] = useState(false);
// //   const [isActive, setIsActive] = useState(true);
// //   const [error, setError] = useState(null);
// //   const camera = useRef(null);
// //   const device = useCameraDevice('back');
// //   const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();
// //   const isFocused = useIsFocused();

// //   const codeScanner = useCodeScanner({
// //     codeTypes: ['qr'],

// //  onCodeScanned: async (codes) => {
// //             if (codes.length > 0 && isActive && isFocused) {
// //                 setIsActive(false);
// //                 const qrData = codes[0].value;
                
// //                 try {
// //                     const authData = await auth.getAuthData();
                    
// //                     if (!authData?.token) {
// //                         throw new Error('Authentication required - please login again');
// //                     }

// //                     const response = await api.student.joinSession({ qr_data: qrData });

// //                     if (response?.data?.error) {
// //                         throw new Error(response.data.error);
// //                     }

// //                     if (!response?.data?.session_id) {
// //                         throw new Error('Failed to join session - invalid response');
// //                     }

// //                     // Navigate to lobby instead of directly to session
// //                     navigation.navigate('Lobby', { 
// //                         sessionId: response.data.session_id 
// //                     });
                    
// //                 } catch (error) {
// //                     console.error('QR Scan Error:', error);
// //                     setIsActive(true);
// //                     Alert.alert(
// //                         'Session Error',
// //                         error.message || 'Failed to join session',
// //                         [{ 
// //                             text: 'OK', 
// //                             onPress: () => setIsActive(true)
// //                         }]
// //                     );
// //                 }
// //             }
// //         }

// //   });

// //   useEffect(() => {
// //     const requestCameraPermission = async () => {
// //       if (Platform.OS === 'android') {
// //         const granted = await PermissionsAndroid.request(
// //           PermissionsAndroid.PERMISSIONS.CAMERA,
// //           {
// //             title: "Camera Permission",
// //             message: "App needs access to your camera",
// //             buttonNeutral: "Ask Me Later",
// //             buttonNegative: "Cancel",
// //             buttonPositive: "OK"
// //           }
// //         );
// //         setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
// //       } else {
// //         if (!cameraPermission) {
// //           const permission = await requestPermission();
// //           setHasPermission(permission);
// //         } else {
// //           setHasPermission(true);
// //         }
// //       }
// //     };
// //     requestCameraPermission();
// //   }, [cameraPermission]);

// //   if (!hasPermission) {
// //     return (
// //       <View style={styles.loading}>
// //         <Text>Camera permission not granted</Text>
// //       </View>
// //     );
// //   }

// //   if (!device) {
// //     return (
// //       <View style={styles.loading}>
// //         <Text>Camera device not found</Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.container}>
// //       {/* <HamburgerHeader title="Scan QR Code" /> */}
// //       <Camera
// //         ref={camera}
// //         style={StyleSheet.absoluteFill}
// //         device={device}
// //         isActive={isActive && isFocused}
// //         codeScanner={codeScanner}
// //         torch={'off'}
// //         zoom={1}
// //       />

// //       <View style={styles.overlay}>
// //         <View style={styles.border} />
// //         <Text style={styles.instructionText}>
// //           Align QR code within the frame
// //         </Text>
// //         {error && (
// //           <View style={styles.errorContainer}>
// //             <Text style={styles.errorText}>{error}</Text>
// //             <TouchableOpacity
// //               style={styles.retryButton}
// //               onPress={() => {
// //                 setError(null);
// //                 setIsActive(true);
// //               }}
// //             >
// //               <Text style={styles.retryButtonText}>Try Again</Text>
// //             </TouchableOpacity>
// //           </View>
// //         )}
// //       </View>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: 'black',
// //   },
// //   loading: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: 'white',
// //   },
// //   overlay: {
// //     ...StyleSheet.absoluteFillObject,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   border: {
// //     width: 250,
// //     height: 250,
// //     borderWidth: 2,
// //     borderColor: 'white',
// //     borderRadius: 10,
// //     backgroundColor: 'transparent',
// //   },
// //   instructionText: {
// //     color: 'white',
// //     fontSize: 16,
// //     marginTop: 20,
// //     textAlign: 'center',
// //     paddingHorizontal: 20,
// //   },
// //   errorContainer: {
// //     backgroundColor: 'rgba(0,0,0,0.7)',
// //     padding: 20,
// //     borderRadius: 10,
// //     marginTop: 20,
// //     alignItems: 'center',
// //   },
// //   errorText: {
// //     color: 'red',
// //     fontSize: 16,
// //     textAlign: 'center',
// //     marginBottom: 10,
// //   },
// //   retryButton: {
// //     backgroundColor: 'white',
// //     padding: 10,
// //     borderRadius: 5,
// //   },
// //   retryButtonText: {
// //     color: 'black',
// //     fontWeight: 'bold',
// //   },
// // });