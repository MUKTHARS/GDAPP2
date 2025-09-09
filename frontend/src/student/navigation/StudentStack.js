// student/navigation/StudentStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HamburgerHeader from '../components/HamburgerHeader';
import { View, Button } from 'react-native';
import LobbyScreen from '../screens/LobbyScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import LoginScreen from '../screens/LoginScreen';
import SessionBooking from '../screens/SessionBooking';
import GdSessionScreen from '../screens/GdSessionScreen';
import QrScannerScreen from '../screens/QrScannerScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SurveyScreen from '../screens/SurveyScreen';
import WaitingScreen from '../screens/WaitingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppSwitchBlocker from '../components/AppSwitchBlocker';

const Stack = createStackNavigator();

// Wrap each screen component with AppSwitchBlocker
const ProtectedLobbyScreen = AppSwitchBlocker(LobbyScreen);
const ProtectedFeedbackScreen = AppSwitchBlocker(FeedbackScreen);
const ProtectedLoginScreen = AppSwitchBlocker(LoginScreen);
const ProtectedSessionBooking = AppSwitchBlocker(SessionBooking);
const ProtectedGdSessionScreen = AppSwitchBlocker(GdSessionScreen);
const ProtectedQrScannerScreen = AppSwitchBlocker(QrScannerScreen);
const ProtectedResultsScreen = AppSwitchBlocker(ResultsScreen);
const ProtectedSurveyScreen = AppSwitchBlocker(SurveyScreen);
const ProtectedWaitingScreen = AppSwitchBlocker(WaitingScreen);
const ProtectedProfileScreen = AppSwitchBlocker(ProfileScreen);

const StudentStack = ({ onAdminSwitch }) => {
  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        header: ({ navigation }) => {
          if (route.name === 'Login') {
            return null;
          }
          return (
            <View>
              <HamburgerHeader title={getHeaderTitle(route)} navigation={navigation} />
              {route.name === 'SessionBooking' && (
                <Button 
                  title="Admin" 
                  onPress={onAdminSwitch}
                  style={{ position: 'absolute', right: 10, top: 10 }}
                />
              )}
            </View>
          );
        },
      })}
    >
      <Stack.Screen name="Login" component={ProtectedLoginScreen} />
      <Stack.Screen name="SessionBooking" component={ProtectedSessionBooking} />
      <Stack.Screen name="QrScanner" component={ProtectedQrScannerScreen} />
      <Stack.Screen name="GdSession" component={ProtectedGdSessionScreen} />
      <Stack.Screen name="Survey" component={ProtectedSurveyScreen} />
      <Stack.Screen name="Results" component={ProtectedResultsScreen} />
      <Stack.Screen name="Lobby" component={ProtectedLobbyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Waiting" component={ProtectedWaitingScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="Feedback" component={ProtectedFeedbackScreen} />
      <Stack.Screen name="Profile" component={ProtectedProfileScreen} options={{ headerShown: false }}/>
    </Stack.Navigator>
  );
};

const getHeaderTitle = (route) => {
  const routeName = route.name;
  
  switch (routeName) {
    case 'SessionBooking':
      return 'Available Sessions';
    case 'QrScanner':
      return 'Join Session';
    case 'GdSession':
      return 'GD Session';
    case 'Survey':
      return 'Survey';
    case 'Results':
      return 'Results';
    default:
      return '';
  }
};

export default StudentStack;


// // StudentStack.js
// import React from 'react';
// import { createStackNavigator } from '@react-navigation/stack';
// import HamburgerHeader from '../components/HamburgerHeader';
// import { View, Button } from 'react-native';
// import LobbyScreen from '../screens/LobbyScreen';
// import FeedbackScreen from '../screens/FeedbackScreen';
// import SessionBooking from '../screens/SessionBooking';
// import GdSessionScreen from '../screens/GdSessionScreen';
// import QrScannerScreen from '../screens/QrScannerScreen';
// import ResultsScreen from '../screens/ResultsScreen';
// import SurveyScreen from '../screens/SurveyScreen';
// import WaitingScreen from '../screens/WaitingScreen';

// const Stack = createStackNavigator();

// const StudentStack = ({ onLogout }) => {
//   // Create a custom header component with logout button
//   const CustomHeader = ({ title, navigation }) => (
//     <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 }}>
//       <HamburgerHeader title={title} navigation={navigation} />
//       <Button title="Logout" onPress={onLogout} />
//     </View>
//   );

//   return (
//     <Stack.Navigator
//       screenOptions={({ route }) => ({
//         header: ({ navigation }) => {
//           if (route.name === 'Login') {
//             return null;
//           }
//           return (
//             <CustomHeader 
//               title={getHeaderTitle(route)} 
//               navigation={navigation} 
//             />
//           );
//         },
//       })}
//     >
//       <Stack.Screen name="SessionBooking" component={SessionBooking} />
//       <Stack.Screen name="QrScanner" component={QrScannerScreen} />
//       <Stack.Screen name="GdSession" component={GdSessionScreen} />
//       <Stack.Screen name="Survey" component={SurveyScreen} />
//       <Stack.Screen name="Results" component={ResultsScreen} />
//       <Stack.Screen name="Lobby" component={LobbyScreen} options={{ headerShown: false }} />
//       <Stack.Screen name="Waiting" component={WaitingScreen} options={{ headerShown: false }}/>
//       <Stack.Screen name="Feedback" component={FeedbackScreen} />
//     </Stack.Navigator>
//   );
// };

// const getHeaderTitle = (route) => {
//   const routeName = route.name;
  
//   switch (routeName) {
//     case 'SessionBooking':
//       return 'Available Sessions';
//     case 'QrScanner':
//       return 'Join Session';
//     case 'GdSession':
//       return 'GD Session';
//     case 'Survey':
//       return 'Survey';
//     case 'Results':
//       return 'Results';
//     default:
//       return '';
//   }
// };

// export default StudentStack;







// // StudentStack.js
// import React from 'react';
// import { createStackNavigator } from '@react-navigation/stack';
// import HamburgerHeader from '../components/HamburgerHeader';
// import { View, Button } from 'react-native';
// import LobbyScreen from '../screens/LobbyScreen';
// import FeedbackScreen from '../screens/FeedbackScreen';
// import LoginScreen from '../screens/LoginScreen';
// import SessionBooking from '../screens/SessionBooking';
// import GdSessionScreen from '../screens/GdSessionScreen';
// import QrScannerScreen from '../screens/QrScannerScreen';
// import ResultsScreen from '../screens/ResultsScreen';
// import SurveyScreen from '../screens/SurveyScreen';
// import WaitingScreen from '../screens/WaitingScreen';
// const Stack = createStackNavigator();

// const StudentStack = ({ onAdminSwitch }) => {
//   return (
//     <Stack.Navigator
//       screenOptions={({ route }) => ({
//         header: ({ navigation }) => {
//           if (route.name === 'Login') {
//             return null;
//           }
//           return (
//             <View>
//               <HamburgerHeader title={getHeaderTitle(route)} navigation={navigation} />
//               {route.name === 'SessionBooking' && (
//                 <Button 
//                   title="Admin" 
//                   onPress={onAdminSwitch}
//                   style={{ position: 'absolute', right: 10, top: 10 }}
//                 />
//               )}
//             </View>
//           );
//         },
//       })}
//     >
//       <Stack.Screen name="Login" component={LoginScreen} />
//       <Stack.Screen name="SessionBooking" component={SessionBooking} />
//       <Stack.Screen name="QrScanner" component={QrScannerScreen} />
//       <Stack.Screen name="GdSession" component={GdSessionScreen} />
//       <Stack.Screen name="Survey" component={SurveyScreen} />
//       <Stack.Screen name="Results" component={ResultsScreen} />
//       <Stack.Screen name="Lobby" component={LobbyScreen} options={{ headerShown: false }} />
//     <Stack.Screen name="Waiting" component={WaitingScreen} options={{ headerShown: false }}/>
//     <Stack.Screen name="Feedback" component={FeedbackScreen} />
    
//     </Stack.Navigator>
//   );
// };

// // getHeaderTitle function remains the same
// const getHeaderTitle = (route) => {
//   const routeName = route.name;
  
//   switch (routeName) {
//     case 'SessionBooking':
//       return 'Available Sessions';
//     case 'QrScanner':
//       return 'Join Session';
//     case 'GdSession':
//       return 'GD Session';
//     case 'Survey':
//       return 'Survey';
//     case 'Results':
//       return 'Results';
//     default:
//       return '';
//   }
// };

// export default StudentStack;

