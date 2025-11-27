import React, { useState, useEffect } from "react";
import { FaRobot, FaClock, FaBook, FaBullseye, FaBolt, FaCalendarAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";
import { getToken } from "../utils/auth";

const Dashboard = () => {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState({
    studyHours: 0,
    topicsStudied: 0,
    avgProgress: 0,
    studySessions: 0,
  });

  // Teacher-specific state
  const [teacherStats, setTeacherStats] = useState({
    totalQuizzes: 0,
    totalAnnouncements: 0,
    totalStudents: 0,
    avgAttendance: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [learningProgress, setLearningProgress] = useState([]);
  const [profile, setProfile] = useState({ name: "", branch: "" });

  useEffect(() => {
    const token = getToken();
    
    if (userRole === "teacher") {
      // Fetch teacher-specific data
      fetchTeacherData(token);
    } else {
      // Fetch student-specific data
      fetchStudentData(token);
    }

    // Fetch profile for name and branch
    axios
      .get("http://localhost:8000/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const p = res.data || {};
        setProfile({ name: p.name || "", branch: p.branch || "" });
      })
      .catch((err) => {
        console.error("Profile fetch failed", err);
      });
  }, [userRole]);

  const fetchStudentData = (token) => {
    console.log("🔍 Dashboard: Fetching student stats with token:", token ? "Present" : "Missing");
    
    axios
      .get("http://localhost:8000/query/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        console.log("✅ Dashboard: Student stats response received:", res.data);
        const data = res.data || {};

        setStats({
          studyHours: data.studyHours || 0,
          topicsStudied: data.topicsStudied || 0,
          avgProgress: data.avgProgress || 0,
          studySessions: data.studySessions || 0,
        });

        setRecentActivity(data.recentActivity ?? []);
        setLearningProgress(data.learningProgress ?? []);
      })
      .catch((err) => {
        console.error("❌ Dashboard: Student stats fetch failed", err);
        setRecentActivity([]);
        setLearningProgress([]);
      });
  };

  const fetchTeacherData = async (token) => {
    console.log("🔍 Dashboard: Fetching teacher data");
    
    try {
      // Fetch teacher dashboard data
      const [quizzesRes, announcementsRes, studentsRes, attendanceRes] = await Promise.all([
        axios.get("http://localhost:8000/quizzes", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:8000/announcements", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:8000/students", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:8000/attendance", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const quizzes = quizzesRes.data || [];
      const announcements = announcementsRes.data || [];
      const students = studentsRes.data || [];
      const attendance = attendanceRes.data || [];

      // Calculate average attendance
      const avgAttendance = attendance.length > 0 
        ? Math.round(attendance.reduce((acc, att) => acc + (att.present ? 1 : 0), 0) / attendance.length * 100)
        : 0;

      setTeacherStats({
        totalQuizzes: quizzes.length,
        totalAnnouncements: announcements.length,
        totalStudents: students.length,
        avgAttendance: avgAttendance
      });

      // Set recent activity for teachers
      const recentQuizzes = quizzes.slice(0, 3).map(quiz => ({
        title: `Created quiz: ${quiz.title}`,
        date: new Date(quiz.created_at).toLocaleDateString(),
        type: "Quiz",
        duration: `${quiz.questions?.length || 0} questions`
      }));

      const recentAnnouncements = announcements.slice(0, 2).map(ann => ({
        title: `Posted announcement`,
        date: new Date(ann.created_at).toLocaleDateString(),
        type: "Announcement",
        duration: ann.subject || "General"
      }));

      setRecentActivity([...recentQuizzes, ...recentAnnouncements]);

    } catch (err) {
      console.error("❌ Dashboard: Teacher data fetch failed", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 p-4 flex flex-col">
        <div className="text-2xl font-bold text-blue-400 mb-6">NoteNinja AI</div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-700"></div>
          <div>
            <p className="font-semibold">{profile.name || (userRole === "teacher" ? "Teacher" : "Student")}</p>
            <p className="text-xs text-gray-400">{profile.branch ? `${profile.branch} ${userRole === "teacher" ? "Teacher" : "Student"}` : userRole?.toUpperCase()}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <Link to="/dashboard" className="p-2 rounded hover:bg-gray-800 bg-blue-600">Dashboard</Link>
          {userRole === "teacher" ? (
            // Teacher Navigation
            <>
              <Link to="/teacher-management" className="p-2 rounded hover:bg-gray-800">📊 Management</Link>
              <Link to="/teacher" className="p-2 rounded hover:bg-gray-800">📢 Announcements</Link>
              <Link to="/QuizManager" className="p-2 rounded hover:bg-gray-800">📝 Create Quiz</Link>
              <Link to="/teacher" className="p-2 rounded hover:bg-gray-800">📚 Upload Materials</Link>
              <Link to="/quizzes" className="p-2 rounded hover:bg-gray-800">📋 All Quizzes</Link>
            </>
          ) : (
            // Student Navigation
            <>
              <Link to="/student" className="p-2 rounded hover:bg-gray-800">Ask AI</Link>
              <Link to="/study-planner" className="p-2 rounded hover:bg-gray-800">Study Planner</Link>
              <Link to="/quizzes" className="p-2 rounded hover:bg-gray-800">Quizzes</Link>
              <Link to="/attendance" className="p-2 rounded hover:bg-gray-800">My Attendance</Link>
              <Link to="/marks" className="p-2 rounded hover:bg-gray-800">My Marks</Link>
            </>
          )}
          <Link to="/profile" className="p-2 rounded hover:bg-gray-800">Profile</Link>
        </nav>
        <button className="p-2 rounded hover:bg-gray-800 text-red-400 mt-auto">Logout</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{userRole === "teacher" ? "Teacher Dashboard" : "Student Dashboard"}</h1>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
          >
            Refresh Data
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {userRole === "teacher" ? (
            // Teacher Stats
            <>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <p>Total Quizzes</p>
                  <span className="text-2xl">📝</span>
                </div>
                <p className="text-2xl font-bold">{teacherStats.totalQuizzes}</p>
              </div>
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <p>Announcements</p>
                  <span className="text-2xl">📢</span>
                </div>
                <p className="text-2xl font-bold">{teacherStats.totalAnnouncements}</p>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <p>Total Students</p>
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-2xl font-bold">{teacherStats.totalStudents}</p>
              </div>
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <p>Avg Attendance</p>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-2xl font-bold">{teacherStats.avgAttendance}%</p>
              </div>
            </>
          ) : (
            // Student Stats
            <>
              <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <p>Study Hours</p>
                  <FaClock />
                </div>
                <p className="text-2xl font-bold">{typeof stats.studyHours === 'number' ? stats.studyHours.toFixed(1) : '0.0'}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <p>Topics Studied</p>
                  <FaBook />
                </div>
                <p className="text-2xl font-bold">{stats.topicsStudied}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <p>Avg Progress</p>
                  <FaBullseye />
                </div>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <p>Study Sessions</p>
                  <FaBolt />
                </div>
                <p className="text-2xl font-bold">{stats.studySessions}</p>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {userRole === "teacher" ? (
            // Teacher Quick Actions
            <>
              <Link to="/teacher-management" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                📊 Management Dashboard
              </Link>
              <Link to="/QuizManager" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                📝 Create Quiz
              </Link>
              <Link to="/teacher" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                📢 Post Announcement
              </Link>
              <Link to="/teacher" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                📚 Upload Materials
              </Link>
            </>
          ) : (
            // Student Quick Actions
            <>
              <Link to="student" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                <FaRobot className="text-2xl mr-2" /> Ask AI
              </Link>
              <Link to="/quizzes" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                🧠 Take Quiz
              </Link>
              <Link to="/attendance" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                📊 My Attendance
              </Link>
              <Link to="/marks" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                📈 My Marks
              </Link>
              <Link to="/study-planner" className="bg-gray-900 p-4 rounded-lg flex items-center justify-center hover:bg-gray-800">
                <FaCalendarAlt className="text-2xl mr-2" /> Study Planner
              </Link>
            </>
          )}
        </div>

        {/* Learning Progress & Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded-lg">
            <h2 className="font-bold mb-2">Learning Progress</h2>
            {(learningProgress || []).map((lp, idx) => (
              <div key={idx}>
                <p>{lp.subject}</p>
                <div className="w-full bg-gray-800 rounded h-2 my-2">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${lp.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400">{lp.hours} hours studied</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 p-4 rounded-lg">
            <h2 className="font-bold mb-2">Recent Activity</h2>
            {(recentActivity || []).map((act, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center border-b border-gray-800 py-2"
              >
                <div>
                  <p>{act.title}</p>
                  <p className="text-xs text-gray-400">
                    {act.date} · {act.type}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{act.duration}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
