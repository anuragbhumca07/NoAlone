import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Everything past the landing/login pages is code-split so a fresh visitor's
// first paint doesn't have to download the entire app — chat, calls, rooms,
// AI buddy, etc. only load once the user actually navigates there.
const Register = lazy(() => import('./pages/Register'));
const Verify = lazy(() => import('./pages/Verify'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const AppShell = lazy(() => import('./components/AppShell'));
const Chats = lazy(() => import('./pages/Chats'));
const Conversation = lazy(() => import('./pages/Conversation'));
const Calls = lazy(() => import('./pages/Calls'));
const RandomChat = lazy(() => import('./pages/RandomChat'));
const AiBuddy = lazy(() => import('./pages/AiBuddy'));
const Rooms = lazy(() => import('./pages/Rooms'));
const RoomChat = lazy(() => import('./pages/RoomChat'));
const Profile = lazy(() => import('./pages/Profile'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth/google" element={<OAuthCallback />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/chats" element={<Chats />} />
          <Route path="/chats/:id" element={<Conversation />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/random" element={<RandomChat />} />
          <Route path="/ai-buddy" element={<AiBuddy />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomChat />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
