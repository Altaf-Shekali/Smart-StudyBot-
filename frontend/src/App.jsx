import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentChat from "./components/StudentChat";
import { AuthProvider } from "./Context/AuthContext";
import Navbar from "./components/Navbar";
import './index.css';
import HistoryPage from "./components/HistoryPage";

function App() {
  return (
    <Router>
      <AuthProvider>
      <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentChat />} />
        <Route path="/login" element={<Login />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
      </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
