import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MessagePage from './pages/MessagePage';

function Protected({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={user ? <Navigate to="/messages" replace /> : <LoginPage />}
            />
            <Route
                path="/messages"
                element={<Protected><MessagePage /></Protected>}
            />
            <Route 
                path="*" 
                element={<Navigate to="/messages" replace />} 
            />
        </Routes>
    );
}