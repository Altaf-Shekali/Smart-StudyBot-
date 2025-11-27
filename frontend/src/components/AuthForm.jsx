import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const AuthForm = ({ isLogin }) => {
  const [isTeacher, setIsTeacher] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    branch: "",
    year: "",
    semester: "",
    usn: ""
  });
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "login" : "signup";
    const payload = isLogin
      ? {
        username: form.email,
        password: form.password,
      }
      : {
        ...form,
        role: isTeacher ? "teacher" : "student",
      };

    if (!isLogin && isTeacher) {
      delete payload.branch;
      delete payload.year;
      delete payload.semester;
      delete payload.usn;
    }

    try {
      const response = await axios.post(
        `http://localhost:8000/auth/${endpoint}`,
        isLogin ? payload : { ...payload, role: isTeacher ? "teacher" : "student" },
        isLogin ? { headers: { "Content-Type": "application/x-www-form-urlencoded" } } : {}
      );

      if (isLogin) {
        // Fetch user profile data after login
        try {
          const profileResponse = await axios.get("http://localhost:8000/api/profile", {
            headers: { Authorization: `Bearer ${response.data.access_token}` }
          });
          // Use AuthContext login method to properly set user data
          login(response.data.access_token, response.data.role, profileResponse.data);
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
          // Fallback: set token and role without user data
          login(response.data.access_token, response.data.role);
        }
        navigate(`/${response.data.role}`, { replace: true });
        window.location.reload(); // <-- Force refresh after login
      } else {
        alert("Signup successful ✅");
        navigate("/login", { replace: true });
        window.location.reload(); // <-- Force refresh after signup
      }
    } catch (err) {
      alert(`Action failed ❌: ${err.response?.data?.detail || err.message}`);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            {isLogin ? "Welcome Back" : "Join Our Community"}
          </h1>

          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={() => setIsTeacher(!isTeacher)}
              className={`px-6 py-2 rounded-full transition-colors ${isTeacher
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isTeacher ? "Teacher 👩🏫" : "Student 🎓"}
            </button>
          </div>

          <p className="text-gray-400">
            {isLogin
              ? `Sign in as ${isTeacher ? "a teacher" : "a student"}`
              : `Create ${isTeacher ? "teacher" : "student"} account`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required={!isLogin}
              />
            )}

            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {!isTeacher && !isLogin && (
              <>
                <input
                  type="text"
                  placeholder="USN (e.g., 2JR22CS001)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  value={form.usn}
                  onChange={(e) => setForm({ ...form, usn: e.target.value.toUpperCase() })}
                  required={!isTeacher && !isLogin}
                  pattern="2JR\d{2}[A-Z]{2}\d{3}"
                  title="USN must be in format 2JRXXXX000 (e.g., 2JR22CS001)"
                />

                <input
                  type="text"
                  placeholder="Branch (e.g., CSE)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  required={!isTeacher && !isLogin}
                />

                <input
                  type="text"
                  placeholder="Graduation Year (e.g., 2026)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  required={!isTeacher && !isLogin}
                />

                <input
                  type="text"
                  placeholder="Current Semester (e.g., 3)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  required={!isTeacher && !isLogin}
                />
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            {isLogin ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-gray-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => navigate(isLogin ? "/signup" : "/login")}
              className="text-blue-400 hover:text-blue-300 font-medium underline transition-colors"
            >
              {isLogin ? "Sign up here" : "Login here"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;