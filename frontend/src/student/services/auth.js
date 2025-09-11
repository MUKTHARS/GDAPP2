import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default {
    login: async (email, password) => {
        try {
            const response = await api.post('/student/login', { 
                email: email.trim().toLowerCase(), 
                password 
            });
            console.log(response)
            if (!response.data?.token) {
                throw new Error('Authentication failed - no token received');
            }

            // Ensure token is stored as a clean string
            const cleanToken = response.data.token.replace(/^"(.*)"$/, '$1');
            
            // Prepare data for storage with fallbacks
            const storageData = [
                ['token', cleanToken],
                ['role', 'student'],
                ['level', String(response.data.level || 1)],
                ['userID', response.data.user_id || ''],
                ['userLevel', String(response.data.level || 1)],
                ['userRollNumber', response.data.roll_number || ''] // Safe access with fallback
            ];

            await AsyncStorage.multiSet(storageData);
            
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.error || 
                               error.message || 
                               'Invalid credentials';
            throw new Error(errorMessage);
        }
    },

    logout: async () => {
        await AsyncStorage.multiRemove(['token', 'role', 'level', 'userID', 'userLevel', 'userRollNumber']);
    },
    
    getAuthData: async () => {
        const [token, role, level, userID, userLevel, userRollNumber] = await AsyncStorage.multiGet([
            'token', 'role', 'level', 'userID', 'userLevel', 'userRollNumber'
        ]);
        return {
            token: token[1],
            role: role[1],
            level: level[1],
            userID: userID[1],
            userLevel: userLevel[1],
            userRollNumber: userRollNumber[1]
        };
    }
};


// import api from './api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default {
//     login: async (email, password) => {
//   try {
//     const response = await api.post('/student/login', { 
//       email: email.trim().toLowerCase(), 
//       password 
//     });
    
//     if (!response.data?.token) {
//       throw new Error('Authentication failed - no token received');
//     }

//     // Ensure token is stored as a clean string
//     const cleanToken = response.data.token.replace(/^"(.*)"$/, '$1');
//     await AsyncStorage.multiSet([
//       ['token', cleanToken],
//       ['role', 'student'],
//       ['level', String(response.data.level || 1)]
//     ]);
//     await AsyncStorage.setItem('userID', response.data.user_id);
// await AsyncStorage.setItem('userLevel', response.data.level.toString());
//    await AsyncStorage.setItem('userRollNumber', response.data.roll_number); 
//     return response.data;
//   } catch (error) {
//     console.error('Login error:', error);
//     const errorMessage = error.response?.data?.error || 
//                        error.message || 
//                        'Invalid credentials';
//     throw new Error(errorMessage);
//   }
// },

//    logout: async () => {
//     await AsyncStorage.multiRemove(['token', 'role', 'level']);
//   },
  
//   getAuthData: async () => {
//     const [token, role, level] = await AsyncStorage.multiGet(['token', 'role', 'level']);
//     return {
//       token: token[1],
//       role: role[1],
//       level: level[1]
//     };
//   }
// };