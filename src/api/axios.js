import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Crucial for sending HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
