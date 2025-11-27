import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getToken, logout } from "../utils/auth";
import { useAuth } from "../Context/AuthContext";
import {
  FaUser, FaEnvelope, FaUniversity, FaCalendarAlt,
  FaHome, FaEdit, FaSave, FaTimes, FaCog, FaSignOutAlt, FaIdCard
} from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function to update context
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "",
    branch: "",
    year: "",
    semester: "",
    usn: ""
  });
  const [userStats, setUserStats] = useState({
    courses_taken: 0,
    completion_rate: 0,
    quiz_attempts: 0,
    average_score: 0
  });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getToken();
      if (!token) {
        logout();
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get("http://localhost:8000/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserData({
          name: response.data.name || "Not provided",
          email: response.data.email,
          role: response.data.role || "student",
          branch: response.data.branch || "Not provided",
          year: response.data.year || "Not provided",
          semester: response.data.semester || "Not provided",
          usn: response.data.usn || "Not provided"
        });

        // Set user stats if available
        if (response.data.stats) {
          setUserStats(response.data.stats);
        }

        const savedAvatar = localStorage.getItem('avatar');
        if (savedAvatar) setAvatar(savedAvatar);

      } catch (err) {
        console.error("Profile fetch error:", err);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        localStorage.setItem('avatar', imageUrl);
        setAvatar(imageUrl);
        toast.success("Profile picture updated");
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please select a valid image file");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      
      console.log("DEBUG: Sending profile update data:", userData);
      console.log("DEBUG: Data types:", {
        name: typeof userData.name,
        role: typeof userData.role,
        branch: typeof userData.branch,
        year: typeof userData.year,
        semester: typeof userData.semester,
        usn: typeof userData.usn
      });
      
      const response = await axios.put("http://localhost:8000/api/profile", userData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("DEBUG: Profile update response:", response.data);
      
      // Update the AuthContext with the new user data
      login(token, userData.role, userData);
      
      toast.success("Profile updated successfully");
      setEditMode(false);
      
      console.log("DEBUG: Profile updated in database and context:", userData);
    } catch (err) {
      console.error("Profile update error:", err);
      console.error("Error response data:", err.response?.data);
      toast.error("Update failed: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Enhanced Navigation Bar */}
      <nav className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
            <FaUser className="text-white text-xl" />
          </div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            NoteNinja
          </h1>
        </div>

        <div className="flex space-x-4">
          <Link
            to="/dashboard"
            className="flex items-center px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
          >
            <FaHome className="mr-2" />
            Dashboard
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium transition-all"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-700 shadow-2xl shadow-gray-900/50">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Profile Sidebar - Enhanced */}
            <div className="lg:w-1/3 space-y-8">
              <div className="relative group flex justify-center">
                <div className="relative">
                  <img
                    src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&h=500&q=80"}
                    className="w-40 h-40 rounded-full mx-auto border-4 border-gradient-to-r from-blue-500 to-purple-600 object-cover shadow-lg"
                    alt="Profile"
                  />
                  <label className="absolute bottom-2 right-2 bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full cursor-pointer hover:scale-105 transition-transform shadow-md">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAvatarChange}
                      accept="image/*"
                    />
                    <FaEdit className="text-white w-4 h-4" />
                  </label>
                </div>
              </div>

              <div className="space-y-3 text-center">
                <h2 className="text-2xl font-bold text-gray-100">{userData.name}</h2>
                {userData.role === "student" && userData.usn !== "Not provided" && (
                  <p className="text-gray-300 flex items-center justify-center">
                    <FaIdCard className="mr-2 text-green-400" />
                    {userData.usn}
                  </p>
                )}
                <p className="text-gray-300 flex items-center justify-center">
                  <FaUniversity className="mr-2 text-purple-400" />
                  {userData.branch}
                </p>
                <p className="text-gray-300 flex items-center justify-center">
                  <FaCalendarAlt className="mr-2 text-blue-400" />
                  {userData.year ? `Year ${userData.year}` : "Batch not set"}
                </p>
                <p className="text-gray-300 flex items-center justify-center">
                  <FaCalendarAlt className="mr-2 text-orange-400" />
                  {userData.semester ? `Semester ${userData.semester}` : "Semester not set"}
                </p>

                <div className="pt-4">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`flex items-center justify-center w-full py-3 rounded-lg font-medium transition-all ${editMode
                        ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      }`}
                  >
                    {editMode ? (
                      <>
                        <FaTimes className="mr-2" /> Cancel Edit
                      </>
                    ) : (
                      <>
                        <FaEdit className="mr-2" /> Edit Profile
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600">
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center">
                  <FaCog className="mr-2 text-blue-400" /> Account Settings
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center text-gray-300 hover:text-white transition-colors cursor-pointer">
                    <span className="bg-gray-600 rounded-full w-2 h-2 mr-3"></span>
                    Privacy Settings
                  </li>
                  <li className="flex items-center text-gray-300 hover:text-white transition-colors cursor-pointer">
                    <span className="bg-gray-600 rounded-full w-2 h-2 mr-3"></span>
                    Notification Preferences
                  </li>
                  <li className="flex items-center text-gray-300 hover:text-white transition-colors cursor-pointer">
                    <span className="bg-gray-600 rounded-full w-2 h-2 mr-3"></span>
                    Security
                  </li>
                </ul>
              </div>
            </div>

            {/* Main Content - Enhanced */}
            <div className="lg:w-2/3">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <h3 className="text-2xl font-bold text-gray-100">Profile Information</h3>
                <div className="flex space-x-2">
                  <Link
                    to="/dashboard"
                    className="hidden md:flex items-center px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200 text-sm"
                  >
                    <FaHome className="mr-2" />
                    Back to Dashboard
                  </Link>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name Field */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                    <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                      <FaUser className="mr-2 text-blue-400" /> Full Name
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-transparent text-lg text-white focus:outline-none ${editMode ? "border-b border-gray-500 pb-1" : ""
                        }`}
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      readOnly={!editMode}
                    />
                  </div>

                  {/* Email Field */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                      <FaEnvelope className="mr-2 text-purple-400" /> Email Address
                    </label>
                    <div className="text-lg text-gray-200">{userData.email}</div>
                  </div>

                  {/* Role Field */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                    <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                      <FaUser className="mr-2 text-blue-400" /> Role
                    </label>
                    {editMode ? (
                      <select
                        className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white mt-1 focus:ring-2 focus:ring-blue-500"
                        value={userData.role}
                        onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                      </select>
                    ) : (
                      <div className="text-lg text-gray-200 capitalize">{userData.role}</div>
                    )}
                  </div>

                  {/* Branch Field */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                    <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                      <FaUniversity className="mr-2 text-purple-400" /> Branch
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-transparent text-lg text-white focus:outline-none ${editMode ? "border-b border-gray-500 pb-1" : ""
                        }`}
                      value={userData.branch}
                      onChange={(e) => setUserData({ ...userData, branch: e.target.value })}
                      readOnly={!editMode}
                    />
                  </div>

                  {/* Year Field */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                    <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                      <FaCalendarAlt className="mr-2 text-blue-400" /> Academic Year
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-transparent text-lg text-white focus:outline-none ${editMode ? "border-b border-gray-500 pb-1" : ""
                        }`}
                      value={userData.year}
                      onChange={(e) => setUserData({ ...userData, year: e.target.value })}
                      readOnly={!editMode}
                    />
                  </div>

                  {/* Semester Field */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                    <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                      <FaCalendarAlt className="mr-2 text-orange-400" /> Current Semester
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-transparent text-lg text-white focus:outline-none ${editMode ? "border-b border-gray-500 pb-1" : ""
                        }`}
                      value={userData.semester}
                      onChange={(e) => setUserData({ ...userData, semester: e.target.value })}
                      readOnly={!editMode}
                    />
                  </div>

                  {/* USN Field - Only for Students */}
                  {userData.role === "student" && (
                    <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                      <label className="text-sm font-medium text-gray-400 mb-1 flex items-center">
                        <FaIdCard className="mr-2 text-green-400" /> USN
                      </label>
                      <input
                        type="text"
                        className={`w-full bg-transparent text-lg text-white focus:outline-none ${editMode ? "border-b border-gray-500 pb-1" : ""
                          }`}
                        value={userData.usn}
                        onChange={(e) => setUserData({ ...userData, usn: e.target.value.toUpperCase() })}
                        readOnly={!editMode}
                        pattern="2JR\d{2}[A-Z]{2}\d{3}"
                        title="USN must be in format 2JRXXXX000 (e.g., 2JR22CS001)"
                      />
                    </div>
                  )}
                </div>

                {editMode && (
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="flex items-center bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
                    >
                      <FaSave className="mr-2" />
                      Save Changes
                    </button>
                  </div>
                )}
              </form>

              {/* Stats Section */}
              <div className="mt-10 pt-6 border-t border-gray-700">
                <h3 className="text-xl font-bold text-gray-100 mb-4">Your Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-4 border border-blue-800/50 text-center">
                    <div className="text-3xl font-bold text-blue-400">{userStats.courses_taken}</div>
                    <div className="text-gray-400 text-sm">Topics Studied</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-4 border border-purple-800/50 text-center">
                    <div className="text-3xl font-bold text-purple-400">{userStats.completion_rate}%</div>
                    <div className="text-gray-400 text-sm">Avg Progress</div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-900/50 to-teal-800/30 rounded-xl p-4 border border-teal-800/50 text-center">
                    <div className="text-3xl font-bold text-teal-400">{userStats.quiz_attempts}</div>
                    <div className="text-gray-400 text-sm">Study Sessions</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 rounded-xl p-4 border border-amber-800/50 text-center">
                    <div className="text-3xl font-bold text-amber-400">{userStats.average_score}</div>
                    <div className="text-gray-400 text-sm">Study Hours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;