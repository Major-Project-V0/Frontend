/**
 * Gemini API Service
 * Handles all API calls to backend Gemini endpoints
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Generate interview questions using Gemini
 * @param {Object} params - Question generation parameters
 * @param {string} params.jobRole - Job role/position
 * @param {string} params.yearsOfExperience - Years of experience
 * @param {string} [params.candidateName] - Optional candidate name
 * @param {number} [params.questionCount] - Number of questions to generate (default from env or 5)
 * @param {string} [params.sessionId] - Optional session ID
 * @returns {Promise<Object>} Response with questions
 */
export const generateInterviewQuestions = async ({
  jobRole,
  yearsOfExperience,
  candidateName = null,
  questionCount = null,
  sessionId = null
}) => {
  try {
    const questionCountValue = questionCount || 
      parseInt(import.meta.env.VITE_QUESTION_GENERATION_COUNT) || 5;

    const response = await axios.post(
      `${API_BASE_URL}/api/gemini/generate-questions/`,
      {
        job_role: jobRole,
        years_of_experience: yearsOfExperience,
        candidate_name: candidateName,
        question_count: questionCountValue,
        session_id: sessionId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error generating questions:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to generate questions'
    };
  }
};

/**
 * Send a chat message to Gemini
 * @param {Object} params - Chat parameters
 * @param {string} params.message - User message
 * @param {string} [params.sessionId] - Conversation session ID
 * @param {Array} [params.conversationHistory] - Previous conversation history
 * @param {string} [params.systemInstruction] - Optional system instruction
 * @param {number} [params.temperature] - Temperature for generation (0-1)
 * @returns {Promise<Object>} Response with AI reply
 */
export const sendChatMessage = async ({
  message,
  sessionId = null,
  conversationHistory = [],
  systemInstruction = null,
  temperature = 0.7
}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/gemini/chat/`,
      {
        message,
        session_id: sessionId,
        conversation_history: conversationHistory,
        system_instruction: systemInstruction,
        temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to send message'
    };
  }
};

/**
 * Get conversation history for a session
 * @param {string} sessionId - Conversation session ID
 * @returns {Promise<Object>} Response with conversation history
 */
export const getConversationHistory = async (sessionId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/gemini/conversation/${sessionId}/`,
      {
        headers: {
          // Add auth token if available
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch conversation history'
    };
  }
};

/**
 * Get generated questions for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Response with generated questions
 */
export const getGeneratedQuestions = async (sessionId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/gemini/questions/${sessionId}/`,
      {
        headers: {
          // Add auth token if available
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching generated questions:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch questions'
    };
  }
};

