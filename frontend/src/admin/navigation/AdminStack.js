import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/Dashboard';
import VenueSetup from '../screens/VenueSetup';
import SessionConfig from '../screens/SessionConfig';
import QrScreen from '../screens/QrScreen';
import SessionRules from '../screens/SessionRules';
import AnalyticsDashboard from '../screens/AnalyticsDashboard';
import SessionCalendar from '../screens/SessionCalendar';
import StudentProgress from '../screens/StudentProgress';
import QuestionBank from '../screens/QuestionBank';
import BulkSessions from '../screens/BulkSessions';
import AdminHamburgerHeader from '../components/AdminHamburgerHeader';
import BookingsScreen from '../screens/BookingsScreen';
import TopParticipantsScreen from '../screens/TopParticipantsScreen';
import AdminFeedbackScreen from '../screens/FeedbackScreen';
import TopicManager from '../screens/TopicManager';
import RankingPointsConfig from '../screens/RankingPointsConfig';
const Stack = createStackNavigator();

const AdminStack = ({ initialRouteName = 'Login', onLoginSuccess }) => {
  const LoginScreenWrapper = (props) => (
    <LoginScreen 
      {...props} 
      onLoginSuccess={() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        props.navigation.navigate('Dashboard');
      }}
    />
  );

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={({ route }) => ({
        header: ({ navigation }) => {
          if (route.name === 'Login') {
            return null;
          }
          return (
            <AdminHamburgerHeader 
              title={getHeaderTitle(route)} 
              navigation={navigation} 
            />
          );
        },
      })}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="VenueSetup" component={VenueSetup} />
       <Stack.Screen name="Bulk Session" component={BulkSessions} />
      <Stack.Screen name="SessionConfig" component={SessionConfig} />
      <Stack.Screen name="QrScreen" component={QrScreen} options={{ title: 'Venue QR Code' }}      />
      <Stack.Screen name="TopParticipants" component={TopParticipantsScreen}  options={{ title: 'Top Performers' }}/>
      <Stack.Screen name="SessionRules" component={SessionRules} />
      <Stack.Screen name="Analytics" component={AnalyticsDashboard} />
      <Stack.Screen name="SessionCalendar" component={SessionCalendar} />
      <Stack.Screen name="StudentProgress" component={StudentProgress} />
      <Stack.Screen name="QuestionBank" component={QuestionBank} />
    <Stack.Screen name="BookedStudents" component={BookingsScreen} />
    <Stack.Screen 
  name="AdminFeedbackScreen" 
  component={AdminFeedbackScreen} 
/>

    <Stack.Screen name="RankingPointsConfig" component={RankingPointsConfig} />
    <Stack.Screen name="TopicManager" component={TopicManager} options={{ title: 'GD Topics' }} />
    </Stack.Navigator>
  );
}
const getHeaderTitle = (route) => {
  const routeName = route.name;
  
  switch (routeName) {
    case 'Dashboard':
      return 'Admin Dashboard';
    case 'VenueSetup':
      return 'Venue Setup';
    case 'SessionConfig':
      return 'Session Configuration';
    case 'QrScreen':
      return 'Venue QR Code';
    case 'SessionRules':
      return 'Session Rules';
    case 'Analytics':
      return 'Analytics Dashboard';
    case 'SessionCalendar':
      return 'Session Calendar';
    case 'StudentProgress':
      return 'Student Progress';
    case 'QuestionBank':
      return 'Question Bank';
    case 'Bulk Session':
      return 'Bulk Session Setup';
    case 'BookedStudents':
      return 'Booked Students';
    case 'TopParticipants':
      return 'Top Performers';
    case 'RankingPointsConfig':
      return 'Ranking Points Config';
    default:
      return '';
  }
};

export default AdminStack;