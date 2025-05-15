import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken, logout } from "../utils/auth";
import { FaUser, FaEnvelope, FaUniversity, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "",
    branch: "",
    year: ""
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
        const response = await axios.get("http://localhost:8000/api/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Profile API Response:", response.data);
        
        // Set user data with proper fallbacks
        setUserData({
          name: response.data.name || "Not provided",
          email: response.data.email,
          role: response.data.role || "student",
          branch: response.data.branch || "Not provided",
          year: response.data.year || "Not provided"
        });

        // Load avatar from localStorage
        const savedAvatar = localStorage.getItem('avatar');
        if (savedAvatar) setAvatar(savedAvatar);

      } catch (err) {
        console.error("Profile fetch error:", err);
        toast.error("Failed to load profile data");
        logout();
        navigate("/login");
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
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        localStorage.setItem('avatar', imageUrl);
        setAvatar(imageUrl);
        toast.success("Profile picture updated");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put("http://localhost:8000/api/api/profile", userData, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      toast.success("Profile updated successfully");
      setEditMode(false);
    } catch (err) {
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
      <nav className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📚</span>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            EduAI Profile
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
        >
          Logout
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Sidebar */}
            <div className="md:w-1/3 space-y-6">
              <div className="relative group">
                <img
                  src={avatar || "https://via.placeholder.com/150"}
                  className="w-32 h-32 rounded-full mx-auto border-4 border-blue-500 object-cover"
                  alt="Profile"
                />
                <label className="absolute bottom-0 right-4 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleAvatarChange}
                    accept="image/*"
                  />
                  <FaUser className="text-white w-5 h-5" />
                </label>
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-gray-100">{userData.name}</h2>
                <p className="text-gray-400 flex items-center justify-center">
                  <FaUniversity className="mr-2" />
                  {userData.branch}
                </p>
                <p className="text-gray-400 flex items-center justify-center">
                  <FaCalendarAlt className="mr-2" />
                  {userData.year ? `Batch ${userData.year}` : "Batch not set"}
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:w-2/3 space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-100">Profile Details</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {editMode ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 bg-gray-700 border ${
                        editMode ? "border-gray-600" : "border-transparent"
                      } rounded-lg text-white pl-12 transition-colors ${
                        editMode ? "focus:ring-2 focus:ring-blue-500" : ""
                      }`}
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      readOnly={!editMode}
                    />
                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>

                  <div className="relative">
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-gray-700 border border-transparent rounded-lg text-white pl-12 cursor-not-allowed"
                      value={userData.email}
                      readOnly
                    />
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>

                  <div className="relative">
                    <select
                      className={`w-full px-4 py-3 bg-gray-700 border ${
                        editMode ? "border-gray-600" : "border-transparent"
                      } rounded-lg text-white pl-12 transition-colors ${
                        editMode ? "focus:ring-2 focus:ring-blue-500" : ""
                      }`}
                      value={userData.role}
                      onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                      disabled={!editMode}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                    <FaUniversity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 bg-gray-700 border ${
                        editMode ? "border-gray-600" : "border-transparent"
                      } rounded-lg text-white pl-12 transition-colors ${
                        editMode ? "focus:ring-2 focus:ring-blue-500" : ""
                      }`}
                      value={userData.branch}
                      onChange={(e) => setUserData({ ...userData, branch: e.target.value })}
                      readOnly={!editMode}
                    />
                    <FaUniversity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 bg-gray-700 border ${
                        editMode ? "border-gray-600" : "border-transparent"
                      } rounded-lg text-white pl-12 transition-colors ${
                        editMode ? "focus:ring-2 focus:ring-blue-500" : ""
                      }`}
                      value={userData.year}
                      onChange={(e) => setUserData({ ...userData, year: e.target.value })}
                      readOnly={!editMode}
                    />
                    <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {editMode && (
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Save Changes
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;