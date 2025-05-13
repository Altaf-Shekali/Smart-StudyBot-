import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    branch: "",
    year: ""
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/auth/signup", form);
      alert("Signup successful ✅");
      navigate("/");
    } catch (err) {
      alert("Signup failed ❌");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            Create Account
          </h1>
          <p className="text-gray-400">Join our learning community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

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

            <select
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>

            <input
              type="text"
              placeholder="Branch (e.g., CSE)"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              required
            />

            <input
              type="text"
              placeholder="Graduation Year (e.g., 2026)"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            Create Account
          </button>

          <p className="text-center text-gray-400 text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-blue-400 hover:text-blue-300 font-medium underline transition-colors"
            >
              Login here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
