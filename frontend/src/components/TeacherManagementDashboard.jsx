import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";
import { getToken } from "../utils/auth";

const TeacherManagementDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [quizzes, setQuizzes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch teacher's data
  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      
      // Fetch quizzes created by teacher
      const quizzesRes = await axios.get("http://localhost:8000/quizzes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(quizzesRes.data);

      // Fetch announcements created by teacher
      const announcementsRes = await axios.get("http://localhost:8000/announcements", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(announcementsRes.data);

      // Fetch students data
      const studentsRes = await axios.get("http://localhost:8000/students", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(studentsRes.data);

      // Fetch attendance data
      const attendanceRes = await axios.get("http://localhost:8000/attendance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(attendanceRes.data);

      // Fetch marks data
      const marksRes = await axios.get("http://localhost:8000/marks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarks(marksRes.data);

    } catch (err) {
      console.error("Error fetching teacher data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
    } catch (err) {
      setError("Failed to delete quiz: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/announcements/${announcementId}`);
      setAnnouncements(announcements.filter(ann => ann.id !== announcementId));
    } catch (err) {
      setError("Failed to delete announcement: " + (err.response?.data?.detail || err.message));
    }
  };

  const OverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100">Total Quizzes</p>
            <p className="text-3xl font-bold">{quizzes.length}</p>
          </div>
          <div className="text-4xl opacity-80">📝</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100">Announcements</p>
            <p className="text-3xl font-bold">{announcements.length}</p>
          </div>
          <div className="text-4xl opacity-80">📢</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100">Total Students</p>
            <p className="text-3xl font-bold">{students.length}</p>
          </div>
          <div className="text-4xl opacity-80">👥</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100">Avg Attendance</p>
            <p className="text-3xl font-bold">
              {attendance.length > 0 ? Math.round(attendance.reduce((acc, att) => acc + (att.present ? 1 : 0), 0) / attendance.length * 100) : 0}%
            </p>
          </div>
          <div className="text-4xl opacity-80">📊</div>
        </div>
      </div>
    </div>
  );

  const QuizzesTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">My Quizzes</h3>
        <span className="text-gray-400">{quizzes.length} total</span>
      </div>
      
      {quizzes.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No quizzes created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-semibold text-white flex-1 mr-2">{quiz.title}</h4>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all"
                  title="Delete quiz"
                >
                  🗑️
                </button>
              </div>
              
              <p className="text-gray-300 text-sm mb-3">{quiz.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subject:</span>
                  <span className="text-white">{quiz.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Branch:</span>
                  <span className="text-white">{quiz.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Year/Sem:</span>
                  <span className="text-white">{quiz.year}/{quiz.semester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Questions:</span>
                  <span className="text-white">{quiz.questions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Due Date:</span>
                  <span className="text-white">{new Date(quiz.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const AnnouncementsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">My Announcements</h3>
        <span className="text-gray-400">{announcements.length} total</span>
      </div>
      
      {announcements.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No announcements created yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 border-l-4 border-l-green-500">
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                  <p className="text-white mb-2">{announcement.content}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>📚 {announcement.subject || "General"}</span>
                    <span>🏫 {announcement.branch}</span>
                    <span>📅 Year {announcement.year}</span>
                    <span>📖 Semester {announcement.semester}</span>
                    <span>🕒 {new Date(announcement.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all"
                  title="Delete announcement"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const StudentsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Students Overview</h3>
        <span className="text-gray-400">{students.length} students</span>
      </div>
      
      {students.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No students data available</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{student.branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{student.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{student.semester}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const AttendanceTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Attendance Records</h3>
        <span className="text-gray-400">{attendance.length} records</span>
      </div>
      
      {attendance.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No attendance records available</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{record.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{record.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.present ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}>
                        {record.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const MarksTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Student Marks</h3>
        <span className="text-gray-400">{marks.length} records</span>
      </div>
      
      {marks.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No marks records available</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Exam Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {marks.map((mark) => (
                  <tr key={mark.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{mark.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{mark.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{mark.exam_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">{mark.marks_obtained}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{mark.total_marks}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        (mark.marks_obtained / mark.total_marks) * 100 >= 60 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {Math.round((mark.marks_obtained / mark.total_marks) * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "quizzes", label: "My Quizzes", icon: "📝" },
    { id: "announcements", label: "My Announcements", icon: "📢" },
    { id: "students", label: "Students", icon: "👥" },
    { id: "attendance", label: "Attendance", icon: "📅" },
    { id: "marks", label: "Marks", icon: "🎯" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            Teacher Management Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome back, {user?.name}! Manage your quizzes, announcements, and track student progress.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-800 text-red-100 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-gray-800 p-2 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard data...</p>
          </div>
        )}

        {/* Tab Content */}
        {!loading && (
          <div>
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "quizzes" && <QuizzesTab />}
            {activeTab === "announcements" && <AnnouncementsTab />}
            {activeTab === "students" && <StudentsTab />}
            {activeTab === "attendance" && <AttendanceTab />}
            {activeTab === "marks" && <MarksTab />}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherManagementDashboard;
