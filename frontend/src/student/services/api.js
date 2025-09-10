import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from './auth';
const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.10.122.91:8080' 
    : 'http://10.10.122.91:8080',
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('Using token:', token ? 'yes' : 'no');
    if (token) {
      const cleanToken = token.replace(/['"]+/g, '').trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
    return config;
  } catch (error) {
    console.error('Token error:', error);
    return config;
  }
}, error => {
  console.error('Request error:', error);
  return Promise.reject(error);
});


api.interceptors.response.use(response => {
  console.log('Response received:', {
    status: response.status,
    url: response.config.url
  });
  
  // Handle empty responses
  if (!response.data) {
    return {
      ...response,
      data: {
        status: 'success',
        data: null
      }
    };
  }
  
  return response;
}, error => {
  // Skip logging for certain errors
  const url = error.config?.url || '';
  const isReadyStatusError = url.includes('/student/session/ready') && error.response?.status === 500;
  
  if (!isReadyStatusError) {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }

  // For 500 errors on ready status endpoint, return a default response
  if (isReadyStatusError) {
    return Promise.resolve({
      data: {
        status: 'success'
      }
    });
  }
  
  // For other 500 errors on survey endpoints, return default response
  if (error.response?.status === 500 && 
      error.config.url.includes('/student/survey/')) {
    return Promise.resolve({
      data: {
        remaining_seconds: 30,
        is_timed_out: false,
        status: 'success'
      }
    });
  }
  
  if (error.response?.status === 401) {
    // Handle unauthorized requests
    console.log('Unauthorized request - redirecting to login');
    return Promise.reject(error);
  }
  
  // For other survey endpoints, return default values
  if (error.config?.url.includes('/student/survey/')) {
    return Promise.resolve({ 
      data: {
        remaining_seconds: 30,
        is_timed_out: false,
        status: 'success'
      }
    });
  }
  
  return Promise.reject(error);
});

api.student = {
  login: (email, password) => api.post('/student/login', { email, password }),
  
    getProfile: () => api.get('/student/profile', {
    validateStatus: function (status) {
      return status < 500;
    },
    transformResponse: [
      function (data) {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          return parsed.profile || {};
        } catch (e) {
          console.error('Profile response parsing error:', e);
          return {};
        }
      }
    ]
  }).catch(error => {
    console.error('Profile API error:', error);
    return { data: {} };
  }),
  
  
  
  getSessions: (level) => api.get(`/student/sessions?level=${level}`),
   getSession: (sessionId) => api.get(`/student/session?session_id=${sessionId}`),
  joinSession: (data) => {
    console.log('Making join session request with data:', data);
    return api.post('/student/sessions/join', data, {
      validateStatus: function (status) {
        console.log('Received status:', status);
        return true; // Always resolve to handle all status codes
      },
      transformResponse: [
        function (data) {
          console.log('Raw response data:', data);
          try {
            // Handle case where backend might return plain text error
            if (typeof data === 'string' && data.includes('error')) {
              return { error: data };
            }
            const parsed = JSON.parse(data);
            console.log('Parsed response:', parsed);
            return parsed;
          } catch (e) {
            console.error('Response parsing error:', e);
            return { error: 'Invalid server response' };
          }
        }
      ]
    }).catch(error => {
      console.error('Join session API error:', {
        message: error.message,
        response: error.response?.data,
        config: error.config
      });
      throw error;
    });
  },
 getSessionParticipants: (sessionId) => api.get('/student/session/participants', { 
    params: { session_id: sessionId },
    transformResponse: [
      function (data) {
        try {
          // Handle empty responses
          if (!data) {
            return { data: [] };
          }
          
          // Handle non-JSON responses (like plain text errors)
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              return { 
                error: data,
                data: [] 
              };
            }
          }
          
          // Handle proper JSON responses
          const parsed = typeof data === 'object' ? data : JSON.parse(data);
          return {
            ...parsed,
            data: parsed.data || []
          };
        } catch (e) {
          console.error('Response parsing error:', e);
          return { data: [] };
        }
      }
    ],
    validateStatus: function (status) {
      // Accept all status codes
      return true;
    }
  }).catch(error => {
    console.error('Participants API error:', error);
    return { data: [] };
  }),
 getUserBookings: () => {
        return api.get('/student/bookings/my', {
            validateStatus: function (status) {
                // Accept all status codes including 404
                return true;
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
                                return [];
                            }
                        }
                        
                        // Handle proper JSON responses
                        const parsed = typeof data === 'object' ? data : JSON.parse(data);
                        return parsed.data || parsed || [];
                    } catch (e) {
                        console.error('Bookings response parsing error:', e);
                        return [];
                    }
                }
            ]
        }).catch(error => {
            console.error('Bookings API error:', error);
            // Return empty array on error
            return { data: [] };
        });
    },
markSurveyCompleted: (sessionId) => api.post('/student/survey/mark-completed', { 
    session_id: sessionId 
}).catch(err => {
    console.log('Mark survey completed error:', err);
    // Return a successful response to allow the flow to continue
    return { data: { status: 'success' } };
}),
checkSurveyCompletion: (sessionId) => api.get('/student/survey/completion', { 
    params: { session_id: sessionId },
    validateStatus: function (status) {
        return status < 500; 
    },
    transformResponse: [
        function (data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                return {
                    all_completed: parsed.all_completed === true, // Ensure boolean
                    completed: parsed.completed || 0,
                    total: parsed.total || 0,
                    session_active: parsed.session_active !== false // Default to true if not specified
                };
            } catch (e) {
                console.error('Completion check parse error:', e);
                return {
                    all_completed: false,
                    completed: 0,
                    total: 0,
                    session_active: true
                };
            }
        }
    ]
}),


submitSurvey: (data, isFinal = false) => {
    console.log('[API] Submitting survey with data:', JSON.stringify(data, null, 2));
    return api.post('/student/survey', {
        session_id: data.sessionId,
        responses: Object.keys(data.responses).reduce((acc, questionKey) => {
            const questionNum = parseInt(questionKey);
            const rankings = data.responses[questionKey];
            console.log(`[API] Processing question ${questionNum} with rankings:`, rankings);
            
            const formattedRankings = {};
            Object.keys(rankings).forEach(rank => {
                const rankNum = parseInt(rank);
                if (rankings[rank]) {
                    formattedRankings[rankNum] = rankings[rank];
                }
            });
            
            if (Object.keys(formattedRankings).length > 0) {
                acc[questionNum] = formattedRankings;
            }
            return acc;
        }, {}),
        is_partial: false,
        is_final: isFinal
    }, {
        validateStatus: function (status) {
            console.log('[API] Received status:', status);
            // Allow all status codes including 500
            return true;
        },
        transformResponse: [
            function (data) {
                console.log('[API] Raw response data:', data);
                try {
                    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    console.log('[API] Parsed response:', parsed);
                    return parsed;
                } catch (e) {
                    console.error('[API] Response parsing error:', e);
                    return { error: 'Invalid server response' };
                }
            }
        ]
    }).catch(error => {
        console.error('[API] Survey submission error:', {
            message: error.message,
            config: error.config,
            response: error.response?.data
        });
        
        // For 500 errors, return a success response to allow the flow to continue
        if (error.response?.status === 500) {
            return { 
                data: { 
                    status: 'success',
                    completed: false,
                    questions_answered: Object.keys(data.responses).length,
                    total_questions: Object.keys(data.responses).length
                }
            };
        }
        
        throw error;
    });
},

  
getResults: (sessionId) => {
  return api.get('/student/results', { 
    params: { session_id: sessionId },
    validateStatus: function (status) {
      // Allow all status codes including 500
      return true;
    },
    transformResponse: [
      function (data) {
        try {
          // Handle empty responses
          if (!data) {
            return { results: [] };
          }
          
          // Handle non-JSON responses
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              return { 
                error: data,
                results: [] 
              };
            }
          }
          
          // Handle proper JSON responses
          const parsed = typeof data === 'object' ? data : JSON.parse(data);
          return {
            ...parsed,
            results: parsed.results || []
          };
        } catch (e) {
          console.error('Results response parsing error:', e);
          return { results: [] };
        }
      }
    ]
  }).catch(error => {
    console.error('Results API error:', error);
    // Return empty results on error
    return { 
      data: { 
        results: [],
        session_id: sessionId
      } 
    };
  });
},


submitFeedback: (sessionId, rating, comments) => api.post('/student/feedback', {
    session_id: sessionId,
    rating: rating,
    comments: comments
}),
getFeedback: (sessionId) => api.get('/student/feedback/get', {
    params: { session_id: sessionId },
    validateStatus: function (status) {
        // Consider 200 and 404 as valid statuses
        return status === 200 || status === 404;
    },
    transformResponse: [
        function (data) {
            try {
                // Handle empty responses or 404 cases
                if (!data || Object.keys(data).length === 0) {
                    return {};
                }
                return typeof data === 'object' ? data : JSON.parse(data);
            } catch (e) {
                console.error('Feedback response parsing error:', e);
                return {};
            }
        }
    ]
}),
  bookVenue: (venueId) => api.post('/student/sessions/book', { venue_id: venueId }),
 checkBooking: (venueId) => api.get('/student/session/check', { 
        params: { venue_id: venueId },
        validateStatus: function (status) {
            return status < 500; // Accept all status codes except server errors
        }
    }),
  cancelBooking: (venueId) => api.delete('/student/session/cancel', { data: { venue_id: venueId } }),
   updateSessionStatus: (sessionId, status) => api.put('/student/session/status', { sessionId, status }),
   startSurveyTimer: (sessionId) => api.post('/student/survey/start', { session_id: sessionId }),
  checkSurveyTimeout: (sessionId) => api.get('/student/survey/timeout', { params: { session_id: sessionId } }),
  applySurveyPenalties: (sessionId) => api.post('/student/survey/penalties', { session_id: sessionId }),
startQuestionTimer: (sessionId, questionId) => api.post('/student/survey/start-question', { 
    session_id: sessionId,
    question_id: questionId
  }).catch(err => {
    console.log('Timer start error:', err);
    // Return a successful response to allow the survey to continue
    return { data: { status: 'success' } };
  }),

checkQuestionTimeout: (sessionId, questionId) => api.get('/student/survey/check-timeout', { 
    params: { 
      session_id: sessionId,
      question_id: questionId
    }
  }).catch(err => {
    console.log('Timeout check error:', err);
    // Return default values if API fails
    return { 
      data: {
        remaining_seconds: 30,
        is_timed_out: false
      }
    };
  }),
  applyQuestionPenalty: (sessionId, questionId, studentId) => api.post('/student/survey/apply-penalty', {
    session_id: sessionId,
    question_id: questionId,
    student_id: studentId
  }),

 getSurveyQuestions: async (level, sessionId = '', studentId = '') => {
    try {
        const params = { level };
        // Add session_id parameter if provided
        if (sessionId) {
            params.session_id = sessionId;
        }
        // Add student_id parameter if provided
        if (studentId) {
            params.student_id = studentId;
        }
        
        console.log('Fetching questions with params:', params);
        
        // First try student-specific endpoint
        const response = await api.get('/student/questions', { 
            params: params,
            validateStatus: (status) => status < 500
        });
        
        console.log('Questions response:', response.data);
        
        // If we get valid data, use it
        if (response.data && Array.isArray(response.data)) {
            return response;
        }
        
        // Fallback to admin endpoint if student endpoint fails
        console.log('Student endpoint failed, trying admin endpoint');
        const adminResponse = await api.get('/admin/questions', {
            params: { level }, // Don't send session_id or student_id to admin endpoint
            validateStatus: (status) => status < 500
        });
        
        console.log('Admin questions response:', adminResponse.data);
        
        return adminResponse;
    } catch (error) {
        console.log('Questions fallback triggered due to error:', error.message);
        return {
            data: [
                { id: 'q1', text: 'Clarity of arguments', weight: 1.0 },
                { id: 'q2', text: 'Contribution to discussion', weight: 1.0 },
                { id: 'q3', text: 'Teamwork and collaboration', weight: 1.0 }
            ]
        };
    }
},

getSessionTopic: (level) => api.get('/student/topic', { 
  params: { level },
  validateStatus: function (status) {
    return status < 500;
  },
  transformResponse: [
    function (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return parsed;
      } catch (e) {
        console.error('Topic response parsing error:', e);
        return {
          topic_text: "Discuss the impact of technology on modern education",
          prep_materials: {}
        };
      }
    }
  ]
}).catch(error => {
  console.error('Topic API error:', error);
  return {
    data: {
      topic_text: "Discuss the impact of technology on modern education",
      prep_materials: {}
    }
  };
}),


getSessionRules: (sessionId) => api.get('/student/session/rules', { 
    params: { session_id: sessionId },
    validateStatus: function (status) {
        return status < 500;
    },
    transformResponse: [
        function (data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                // Ensure we have default values if API fails
                return {
                    prep_time: parsed.prep_time || 5,
                    discussion_time: parsed.discussion_time || 20,
                    survey_time: parsed.survey_time || 5,
                    level: parsed.level || 1
                };
            } catch (e) {
                console.error('Session rules parsing error:', e);
                // Return sensible defaults
                return {
                    prep_time: 5,
                    discussion_time: 20,
                    survey_time: 5,
                    level: 1
                };
            }
        }
    ]
}).catch(error => {
    console.error('Session rules API error:', error);
    // Return defaults on error
    return {
        data: {
            prep_time: 5,
            discussion_time: 20,
            survey_time: 5,
            level: 1
        }
    };
}),

  updateReadyStatus: (sessionId, isReady) => api.post('/student/session/ready', {
    session_id: sessionId,
    is_ready: isReady
  }).catch(error => {
    console.log('Update ready status error, using fallback:', error);
    // Return a successful response to allow the UI to continue
    return { data: { status: 'success' } };
  }),
  
  getReadyStatus: (sessionId) => api.get('/student/session/ready-status', {
    params: { session_id: sessionId }
  }).catch(error => {
    console.log('Get ready status error, using fallback:', error);
    // Return empty array as fallback
    return { data: { ready_statuses: [] } };
  }),
  
  checkAllReady: (sessionId) => api.get('/student/session/check-all-ready', {
    params: { session_id: sessionId }
  }).catch(error => {
    console.log('Check all ready error, using fallback:', error);
    // Return false as fallback
    return { data: { all_ready: false } };
  }),
  };

  

export default api;