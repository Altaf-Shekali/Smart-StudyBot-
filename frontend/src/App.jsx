import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentChat from "./components/StudentChat";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import Navbar from "./components/Navbar";
import './index.css';
import HistoryPage from "./components/HistoryPage";
import HomePage from "./components/HomePage";
import ProfilePage from "./components/ProfilePage";
import SubjectPage from "./components/SubjectPage";
import StudyPlanner from "./components/StudyPlanner";
import Quizzes from "./components/Quizzes";
import Announcements from "./components/Announcements";
import Dashboard from "./components/Dashboard";
import QuizManager from "./components/QuizManager";
import StudentAttendance from "./components/StudentAttendance";
import StudentMarks from "./components/StudentMarks";
import AuthForm from "./components/AuthForm";
import TeacherManagementDashboard from "./components/TeacherManagementDashboard";
// Moved the auth-protected routes into a separate component so we can use useAuth inside AuthProvider
function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signup" element={<AuthForm isLogin={false} />} />
      <Route path="/teacher" element={<TeacherDashboard />} />
      <Route path="/student" element={isLoggedIn ? <StudentChat /> : <Navigate to="/login" />} />
      <Route path="/login" element={<AuthForm isLogin={true} />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/subjects" element={<SubjectPage />} />
      <Route path="/study-planner" element={isLoggedIn ? <StudyPlanner /> : <Navigate to="/login" />} />
      <Route path="/quizzes" element={isLoggedIn ? <Quizzes /> : <Navigate to="/login" />} />
      <Route path="/announcements" element={isLoggedIn ? <Announcements /> : <Navigate to="/login" />} />
      <Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/attendance" element={isLoggedIn ? <StudentAttendance /> : <Navigate to="/login" />} />
      <Route path="/marks" element={isLoggedIn ? <StudentMarks /> : <Navigate to="/login" />} />
      <Route path="/QuizManager" element={isLoggedIn ? <QuizManager /> : <Navigate to="/login" />} />
      <Route path="/teacher-management" element={isLoggedIn ? <TeacherManagementDashboard /> : <Navigate to="/login" />} />
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
