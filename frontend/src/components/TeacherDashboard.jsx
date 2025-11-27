import React, { useState, useEffect } from "react";
import UploadForm from "./UploadForm";
import QuizManager from "./QuizManager";
import QuizResults from "./QuizResults";
import AnnouncementSection from "./Announcements";
import { logout } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AttendanceSection from "./AttendanceSection";
import MarksSection from "./MarksSection";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [filters, setFilters] = useState({
    branch: "cse",
    year: "1",
    semester: "1",
    subject: "math",
  });
  const [stats, setStats] = useState({
    files: 0,
    quizzes: 0,
    announcements: 0,
    attendance: 0, // ✅ added for attendance
    marks: 0, // ✅ added for marks
  });

  // Dropdown data
  const branches = ["cse", "ece", "mech", "civil"];
  const years = ["1", "2", "3", "4"];
  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const subjects = {
    cse: ["ADA", "C", "DSA","OS","CC","CD"],
    ece: ["math", "electronics", "circuits"],
    mech: ["math", "dynamics", "thermodynamics"],
    civil: ["math", "structures", "materials"],
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Stats fetching
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("/api/teacher/stats", {
          params: {
            branch: filters.branch,
            year: filters.year,
            semester: filters.semester,
          },
        });
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, [filters]);


  const handleSectionClick = (section) => {
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* NAVBAR */}
        <nav className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-12 p-4 bg-gray-800 rounded-2xl border border-gray-700">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <span className="text-2xl">📚</span>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Teacher Portal
            </h1>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="grid grid-cols-2 md:flex gap-2">
              {/* Filters */}
              <select
                value={filters.branch}
                onChange={(e) =>
                  setFilters({ ...filters, branch: e.target.value })
                }
                className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch.toUpperCase()}
                  </option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={(e) =>
                  setFilters({ ...filters, year: e.target.value })
                }
                className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>

              <select
                value={filters.semester}
                onChange={(e) =>
                  setFilters({ ...filters, semester: e.target.value })
                }
                className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>

              <select
                value={filters.subject}
                onChange={(e) =>
                  setFilters({ ...filters, subject: e.target.value })
                }
                className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                {subjects[filters.branch]?.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* SECTION NAVIGATION */}
        <div className="flex flex-wrap gap-2 md:gap-4 mb-6 p-2 bg-gray-800 rounded-xl border border-gray-700">
          {[
            "dashboard",
            "uploads",
            "quizzes",
            "announcements",
            "quiz-results",
            "attendance",
            "marks",
          ].map((section) => (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className={`px-4 py-2 rounded-lg transition-all ${activeSection === section
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        {/* QUIZ MANAGER */}
        {activeSection === "quizzes" && (
          <QuizManager
            branch={filters.branch}
            year={filters.year}
            semester={filters.semester}
            subject={filters.subject}
          />
        )}

        {/* QUIZ RESULTS */}
        {activeSection === "quiz-results" && <QuizResults />}

        {/* ANNOUNCEMENTS */}
        {activeSection === "announcements" && (
          <AnnouncementSection
            branch={filters.branch}
            year={filters.year}
            semester={filters.semester}
            subject={filters.subject}
          />
        )}

        {/* UPLOADS */}
        {activeSection === "uploads" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-100 mb-1">
                Course Materials Upload
              </h2>
              <p className="text-gray-400">
                Upload documents for {filters.branch.toUpperCase()} -{" "}
                {filters.year} - {filters.semester.toUpperCase()} -{" "}
                {filters.subject}
              </p>
            </div>
            <div className="border-2 border-dashed border-gray-600 rounded-2xl p-6 hover:border-blue-500">
              <UploadForm filters={filters} />
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeSection === "attendance" && (
          <AttendanceSection filters={filters} />
        )}

        {/* MARKS */}
        {activeSection === "marks" && (
          <MarksSection filters={filters} />
        )}

        {/* DASHBOARD */}
        {activeSection === "dashboard" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500">
                <h3 className="text-gray-400 text-sm mb-2">Uploaded Files</h3>
                <p className="text-3xl font-bold text-blue-400">
                  {stats.files}
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-purple-500">
                <h3 className="text-gray-400 text-sm mb-2">Active Quizzes</h3>
                <p className="text-3xl font-bold text-purple-400">
                  {stats.quizzes}
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500">
                <h3 className="text-gray-400 text-sm mb-2">Announcements</h3>
                <p className="text-3xl font-bold text-green-400">
                  {stats.announcements}
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-yellow-500">
                <h3 className="text-gray-400 text-sm mb-2">
                  Attendance Records
                </h3>
                <p className="text-3xl font-bold text-yellow-400">
                  {stats.attendance}
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-orange-500">
                <h3 className="text-gray-400 text-sm mb-2">
                  Student Marks
                </h3>
                <p className="text-3xl font-bold text-orange-400">
                  {stats.marks}
                </p>
              </div>
            </div>
            <div className="text-center text-gray-400 py-8">
              <h2 className="text-2xl font-semibold text-gray-100">
                Welcome to the Teacher Dashboard
              </h2>
              <p className="mt-2">
                Select a section above to get started or view your stats.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
