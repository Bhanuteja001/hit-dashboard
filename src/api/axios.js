import axios from 'axios';

const api = axios.create({
  baseURL: "https://hitzone-backend-three.vercel.app/" || 'http://localhost:3000',
  withCredentials: true, // Crucial for sending HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
