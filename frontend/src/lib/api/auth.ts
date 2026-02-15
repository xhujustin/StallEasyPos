import { apiClient, ResponseBase } from './client';
// import { LoginRequest, Token } from '@/types/auth';

// Define types locally if not shared yet
export interface OAuth2PasswordRequestForm {
    username: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface User {
    id: number;
    username: string;
    email?: string;
    is_active: boolean;
    role?: string;
}

export const authApi = {
    login: async (credentials: OAuth2PasswordRequestForm): Promise<TokenResponse> => {
        // FastAPI OAuth2PasswordRequestForm expects form-data
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        // Update URL to match backend standard /auth/login
        const response = await apiClient.post<ResponseBase<TokenResponse>>('/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.data.data) {
            throw new Error('Login failed: No data received');
        }
        return response.data.data;
    },

    getMe: async () => {
        // Assuming we have a User type, using any for now or basic shape
        // Wrapper ResponseBase is expected here too
        const response = await apiClient.get<ResponseBase<any>>('/users/me');
        return response.data.data; // access ResponseBase.data
    }
};
