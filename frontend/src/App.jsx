import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentChat from "./components/StudentChat";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import Navbar from "./components/Navbar";
import './index.css';
import HistoryPage from "./components/HistoryPage";
import HomePage from "./components/HomePage";
import ProfilePage from "./components/ProfilePage";

// Moved the auth-protected routes into a separate component so we can use useAuth inside AuthProvider
function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/teacher" element={<TeacherDashboard />} />
      <Route path="/student" element={<StudentChat />} />
      <Route path="/login" element={<Login />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route
        path="/profile"
        element={isLoggedIn ? <ProfilePage /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen">
          <Navbar />
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
