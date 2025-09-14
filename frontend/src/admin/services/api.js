import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
  ? 'https://learnathon.bitsathy.ac.in/api/gd' 
    : 'https://learnathon.bitsathy.ac.in/api/gd',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting token from storage:', error);
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add these API endpoints
api.admin = {
  getSessionRules: (level) => api.get('/admin/rules', { params: { level } }),
  updateSessionRules: (data) => api.post('/admin/rules', data),
  getVenues: () => api.get('/admin/venues'),
   generateQR: (venueId) => api.get('/admin/qr', { 
    params: { 
      venue_id: venueId 
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500;
    },
    timeout: 15000
  }),
 updateVenue: (id, data) => api.put(`/admin/venues/${id}`, data, {
  headers: {
    'Content-Type': 'application/json'
  }
}),
deleteVenue: (venueId) => api.delete('/admin/venues', { 
    params: { id: venueId },
    validateStatus: function (status) {
        return status < 500;
    }
}),
  createVenue: (data) => api.post('/admin/venues', data),
  getBookings: () => api.get('/admin/bookings', {
    validateStatus: function (status) {
      return status < 500; // Resolve only if the status code is less than 500
    }
  }),

createBulkSessions: (data) => {
  return api.post('/admin/sessions/bulk', data, {
    validateStatus: function (status) {
      return status < 500;
    },
    transformRequest: [(data) => {
      const sessions = data.sessions.map(session => ({
        ...session,
        start_time: new Date(session.start_time).toISOString(),
        end_time: new Date(session.end_time).toISOString()
      }));
      return JSON.stringify({ sessions });
    }]
  });
},
getSessions: () => api.get('/admin/sessions', {
  validateStatus: function (status) {
    return status < 500; // Accept all status codes except server errors
  },
  transformResponse: [
    function (data) {
      try {
        // Handle empty responses
        if (!data) {
          return [];
        }
        
        // Handle non-JSON responses
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch (e) {
            console.error('Failed to parse sessions response:', e);
            return [];
          }
        }
        
        // Handle proper JSON responses
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error('Sessions response parsing error:', e);
        return [];
      }
    }
  ]
}),


getSessionFeedbacks: (sessionId, page = 1, limit = 20) => {
    return api.get('/admin/feedbacks', { 
        params: { 
            session_id: sessionId,
            page,
            limit
        },
        validateStatus: function (status) {
            // Accept all status codes including 500
            return true;
        }
    }).then(response => {
        // Handle 500 errors gracefully
        if (response.status === 500) {
            console.log('Server returned 500 error, using empty feedbacks');
            return {
                data: {
                    feedbacks: [],
                    total: 0,
                    page: page,
                    limit: limit,
                    pages: 1
                }
            };
        }
        
        // Handle successful responses
        try {
            let data = response.data;
            // Handle case where response might be a string
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.log('Failed to parse response as JSON, using empty feedbacks');
                    return {
                        data: {
                            feedbacks: [],
                            total: 0,
                            page: page,
                            limit: limit,
                            pages: 1
                        }
                    };
                }
            }
            
            return {
                data: {
                    feedbacks: data.feedbacks || [],
                    total: data.total || 0,
                    page: data.page || page,
                    limit: data.limit || limit,
                    pages: data.pages || 1
                }
            };
        } catch (e) {
            console.error('Feedback response parsing error:', e);
            return {
                data: {
                    feedbacks: [],
                    total: 0,
                    page: page,
                    limit: limit,
                    pages: 1
                }
            };
        }
    }).catch(error => {
        console.error('Feedbacks API network error:', error);
        return {
            data: {
                feedbacks: [],
                total: 0,
                page: page,
                limit: limit,
                pages: 1
            }
        };
    });
},

 getFeedbackStats: () => api.get('/admin/feedback/stats', {
    validateStatus: function (status) {
        return status < 500; // Accept all status codes except server errors
    },
    transformResponse: [
        function (data) {
            try {
                // Handle case where backend might return plain text error
                if (typeof data === 'string') {
                    if (data.includes('error') || data.includes('<!DOCTYPE')) {
                        console.log('Server returned plain text error, using default stats');
                        return {
                            average_rating: 0,
                            total_feedbacks: 0,
                            rating_distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
                        };
                    }
                    // Try to parse as JSON if it's stringified JSON
                    try {
                        const parsed = JSON.parse(data);
                        return parsed.stats || parsed || {};
                    } catch (e) {
                        console.log('Failed to parse string response, using default stats');
                        return {
                            average_rating: 0,
                            total_feedbacks: 0,
                            rating_distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
                        };
                    }
                }
                
                // Handle proper JSON responses
                const parsed = typeof data === 'object' ? data : JSON.parse(data);
                return parsed.stats || parsed || {};
            } catch (e) {
                console.error('Feedback stats parsing error:', e);
                // Return default values to prevent app crash
                return {
                    average_rating: 0,
                    total_feedbacks: 0,
                    rating_distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
                };
            }
        }
    ]
}).then(response => {
    // Ensure we always have a consistent response structure
    return {
        data: typeof response.data === 'object' ? response.data : { stats: response.data }
    };
}).catch(error => {
    console.error('Feedback stats API error:', error);
    // Return default values on network errors
    return {
        data: {
            stats: {
                average_rating: 0,
                total_feedbacks: 0,
                rating_distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }
        }
    };
}),
 getRankingPoints: (level) => api.get('/admin/ranking-points', { 
    params: level ? { level } : {} 
  }),
  updateRankingPoints: (data) => api.post('/admin/ranking-points', data),
  deleteRankingPoints: (id) => api.delete('/admin/ranking-points', { 
    params: { id } 
  }),
  toggleRankingPoints: (id) => api.put('/admin/ranking-points/toggle', null, { 
    params: { id } 
  }),

getQRHistory: (venueId) => api.get('/admin/qr/history', { 
  params: { 
    venue_id: venueId 
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  },
  timeout: 15000
}).then(response => {
  // Handle different response formats
  if (response.data && response.data.success !== undefined) {
    // New format with success field
    return response;
  } else if (Array.isArray(response.data)) {
    // Old format - array directly
    return {
      ...response,
      data: {
        success: true,
        data: response.data,
        count: response.data.length
      }
    };
  } else {
    // Unknown format, convert to expected format
    return {
      ...response,
      data: {
        success: true,
        data: response.data || [],
        count: Array.isArray(response.data) ? response.data.length : 0
      }
    };
  }
}).catch(error => {
  console.error('QR History API Error:', error);
  // Return a consistent format even on error
  return {
    data: {
      success: false,
      error: error.message,
      data: [],
      count: 0
    }
  };
}),

 getVenues: () => api.get('/student/venues', {
        validateStatus: function (status) {
            return status < 500;
        }
    }),
  getTopParticipants: (params = {}) => api.get('/admin/results/top', { params }),
};

export default api;