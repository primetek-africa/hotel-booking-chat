import { createContext, useCallback, useContext, useState } from 'react';
import { api, getToken, setToken } from '../lib/api.js';
import { disconnectSocket } from '../lib/socket.js';

const AuthContext = createContext(null);

// Read { id, role } from the JWT payload (no verification: the server does that)
function userFromToken() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims =JSON.parse(atob(payload));
        if (claims.exp * 1000 < Date.now()) {
            setToken(null);
            return null;
        }
        return { id: claims.id, role: claims.role };
    } catch {
        setToken(null);
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(userFromToken);

    const login = useCallback(async (email, password) => {
        const data = await api('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        setToken(data.authentication);
        setUser(userFromToken());
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        disconnectSocket();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);