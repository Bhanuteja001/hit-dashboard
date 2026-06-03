import axios from "axios";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseURL =
  typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim() !== ""
    ? rawApiBaseUrl.trim()
    : import.meta.env.DEV
      ? undefined
      : "https://hitzone-backend-three.vercel.app";

console.log(
  "[API] baseURL:",
  baseURL || "<relative api path>",
  "(DEV=",
  import.meta.env.DEV,
  ")",
);

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store token in memory as well as sessionStorage for better reliability
let storedToken =
  typeof window !== "undefined" ? sessionStorage.getItem("token") : null;

// Add token from sessionStorage to every request
api.interceptors.request.use(
  (config) => {
    // Try sessionStorage first, then fallback to stored token
    let token =
      typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) {
      token = storedToken;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        "Token added to request from sessionStorage:",
        token.substring(0, 20) + "...",
      );
    } else {
      console.log("No token found in sessionStorage or memory");
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
      sessionStorage.removeItem("token");
      storedToken = null;
    }
    return Promise.reject(error);
  },
);

export { storedToken };
export default api;
