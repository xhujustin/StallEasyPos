import axios from 'axios';
import { useAuthStore } from '../store/auth-store';

// Create Axios Instance
// Default to localhost:8000 if env not set
const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        // Use the same hostname as the frontend, but port 8000 for backend
        return `${protocol}//${window.location.hostname}:8000/api/v1`;
    }
    // Server-side (SSR) fallback
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
};

const API_URL = getApiUrl();

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

export interface ResponseBase<T> {
    code: number;
    message: string;
    data: T;
}

// Request Interceptor: Inject Token
apiClient.interceptors.request.use(
    (config) => {
        // Read token from Zustand store (or localStorage directly if outside React context)
        // Accessing Zustand store outside hook:
        const token = useAuthStore.getState().token;

        if (token) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (config.headers as any).Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            console.error('API 401 Unauthorized - Logging out');
            // alert('Session expired or invalid. Logging out...'); // Optional debug

            // Trigger logout action
            useAuthStore.getState().logout();

            // Redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
