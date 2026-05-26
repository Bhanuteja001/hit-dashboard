import axios from "axios";

const api = axios.create({
  baseURL: "https://hitzone-backend-three.vercel.app",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store token in memory as well as localStorage for better reliability
let storedToken =
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

// Add token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    // Try localStorage first, then fallback to stored token
    let token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      token = storedToken;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Token added to request:", token.substring(0, 20) + "...");
    } else {
      console.log("No token found in localStorage or memory");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Intercept responses to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("401 Unauthorized - clearing token");
      localStorage.removeItem("token");
      storedToken = null;
    }
    return Promise.reject(error);
  },
);

export { storedToken };
export default api;
