import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Profile from './pages/Profile';
import Chats from './pages/Chats';
import Conversation from './pages/Conversation';
import Calls from './pages/Calls';
import OAuthCallback from './pages/OAuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/oauth/google" element={<OAuthCallback />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/chats/:id" element={<Conversation />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
