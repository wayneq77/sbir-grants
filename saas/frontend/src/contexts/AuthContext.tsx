import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8787' : 'https://sbir-backend.wayneq77.workers.dev');
// Use withCredentials to ensure cookies are sent with cross-subdomain requests
axios.defaults.withCredentials = true;

interface User {
    sub: string;  // Standard JWT 'subject' claim — matches backend payload
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        // 首先檢查 URL hash 中是否有 token（從 OAuth callback 來的）
        const hash = window.location.hash;
        let token = '';
        let needsReload = false;
        
        if (hash && hash.includes('token=')) {
            token = decodeURIComponent(hash.split('token=')[1].split('&')[0]);
            // 存儲到 localStorage
            localStorage.setItem('auth_token', token);
            // 清除 hash，避免刷新時重複處理
            window.location.hash = '';
            // 需要刷新頁面來觸發 React 的重新渲染
            needsReload = true;
        }

        // 如果需要刷新，先刷新頁面
        if (needsReload) {
            window.location.reload();
            return;
        }

        // 如果沒有從 hash 獲取 token，嘗試從 localStorage 獲取
        if (!token) {
            token = localStorage.getItem('auth_token') || '';
        }
        
        // 如果沒有 token，直接結束
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }
        
        try {
            const response = await axios.get(`${API_BASE}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUser(response.data.user);
        } catch {
            // 如果認證失敗，不要立即清除 localStorage，讓用戶可以重新嘗試
            // 為了避免無限迴圈，這裡不自動清除 token
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = () => {
        // Always start from the frontend login page so Turnstile precheck runs first.
        window.location.href = '/login';
    };

    const logout = () => {
        // 清除 localStorage 中的 token
        localStorage.removeItem('auth_token');
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${API_BASE}/auth/logout`;
        form.style.display = 'none';
        document.body.appendChild(form);
        form.submit();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
