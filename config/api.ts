import axios from 'axios';
import { auth } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  
  if (user) {
    // Force refresh the token to ensure it's valid
    const idToken = await user.getIdToken();
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
