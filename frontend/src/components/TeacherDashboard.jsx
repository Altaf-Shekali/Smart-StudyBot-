import React from "react";
import UploadForm from "./UploadForm";
import { logout } from "../utils/auth";
import { useNavigate } from "react-router-dom";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Bar */}
        <nav className="flex justify-between items-center mb-12 p-4 bg-gray-800 rounded-2xl border border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📚</span>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Teacher Portal
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
              />
            </svg>
            <span>Logout</span>
          </button>
        </nav>

        {/* Main Content */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">
              Course Materials Upload
            </h2>
            <p className="text-gray-400">
              Upload PDF documents for your students
            </p>
          </div>
          
          <div className="border-2 border-dashed border-gray-600 rounded-2xl p-6 hover:border-blue-500 transition-colors">
            <UploadForm />
          </div>
        </div>

        {/* Stats Section (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Uploaded Files</h3>
            <p className="text-3xl font-bold text-blue-400">24</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Active Students</h3>
            <p className="text-3xl font-bold text-purple-400">142</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Recent Activity</h3>
            <p className="text-3xl font-bold text-green-400">3h ago</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;