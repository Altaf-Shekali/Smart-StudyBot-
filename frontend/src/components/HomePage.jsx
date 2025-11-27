import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaRobot, FaGraduationCap, FaChartLine, FaComments,
  FaLightbulb, FaBook, FaUserFriends, FaMedal, FaBell
} from 'react-icons/fa';
import { useAuth } from '../Context/AuthContext';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [activeDemo, setActiveDemo] = useState(0);

  // Fetch announcements filtered by student's profile (branch, year, semester)
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const token = localStorage.getItem("token");

        let params = {};
        if (token) {
          try {
            const profileRes = await axios.get("http://localhost:8000/api/profile", {
              headers: { Authorization: `Bearer ${token}` }
            });
            const { branch, year, semester } = profileRes.data || {};
            if (branch) params.branch = branch;
            if (year) params.year = year;
            if (semester) params.semester = semester; // semester might be undefined in current schema
          } catch (e) {
            // If profile fetch fails, fall back to unfiltered announcements
          }
        }

        const response = await axios.get("http://localhost:8000/announcements", { params });

        const mapped = response.data.map((ann) => ({
          id: ann.id,
          title: ann.subject || "General Announcement",
          content: ann.content,
          date: formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })
        }));

        setAnnouncements(mapped);
      } catch (err) {
        console.error("Error fetching announcements:", err);
        setAnnouncements([]);
      }
    };

    fetchAnnouncements();
  }, []);
  const handleStartLearning = () => {
    isLoggedIn ? navigate('/student') : navigate('/login');
  };

  const handleViewDashboard = () => {
    isLoggedIn ? navigate('/dashboard') : navigate('/login');
  };

  // Feature cards data
  const features = [
    {
      icon: <FaGraduationCap className="h-10 w-10 text-blue-400" />,
      title: "Smart Course Support",
      description: "Instant answers to course-related questions with verified sources and textbook references",
      color: "blue"
    },
    {
      icon: <FaChartLine className="h-10 w-10 text-purple-400" />,
      title: "Performance Analytics",
      description: "Track your progress with detailed insights and personalized improvement recommendations",
      color: "purple"
    },
    {
      icon: <FaComments className="h-10 w-10 text-green-400" />,
      title: "Natural Conversations",
      description: "Advanced NLP-powered interactions that understand context and learning preferences",
      color: "green"
    },
    {
      icon: <FaBook className="h-10 w-10 text-amber-400" />,
      title: "Semester Resources",
      description: "Access course-specific materials, quizzes, and announcements tailored to your semester",
      color: "amber"
    },
    {
      icon: <FaLightbulb className="h-10 w-10 text-red-400" />,
      title: "Personalized Learning",
      description: "Adaptive learning paths based on your strengths and weaknesses",
      color: "red"
    },
    {
      icon: <FaUserFriends className="h-10 w-10 text-teal-400" />,
      title: "Collaborative Study",
      description: "Connect with peers for group study sessions and knowledge sharing",
      color: "teal"
    }
  ];

  // Demo chat examples
  const demoChats = [
    {
      question: "Explain quantum computing basics",
      answer: "According to course materials, Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously..."
    },
    {
      question: "What's the difference between TCP and UDP?",
      answer: "As covered in Networking 101, TCP is connection-oriented with error checking, while UDP is connectionless and faster..."
    },
    {
      question: "Help me solve this calculus problem",
      answer: "Let's break it down step-by-step. First, identify the function's derivative using the chain rule..."
    }
  ];

  // Rotate demo examples
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % demoChats.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 text-white">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center py-4 px-6 sm:px-8 lg:px-12">
        <div className="flex items-center space-x-2">
          <FaRobot className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            NoteNinja
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <div className="flex items-center space-x-3">
              <span className="hidden sm:inline text-gray-300">Welcome, {user?.name || "Student"}!</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              >
                My Dashboard
              </button>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-block bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-2xl"
            >
              <FaRobot className="h-12 w-12 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent"
            >
              AI-Powered Learning Revolution
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto"
            >
              Your 24/7 Intelligent Learning Companion. Get instant academic support,
              personalized resources, and semester-specific guidance powered by AI.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button
                onClick={handleStartLearning}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
              >
                <FaComments className="h-5 w-5" />
                <span>Ask Anything</span>
              </button>
              <button
                onClick={handleViewDashboard}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
              >
                <FaChartLine className="h-5 w-5" />
                <span>View Dashboard</span>
              </button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Announcements Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-800/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold flex items-center">
              <FaBell className="mr-3 text-yellow-400" />
              Latest Announcements
            </h2>
            {isLoggedIn && (
              <button
                onClick={() => navigate('/Announcements')}
                className="text-blue-400 hover:text-blue-300 flex items-center"
              >
                View All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {announcements.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                className="bg-gray-800/80 border border-gray-700 rounded-2xl p-6 transition-all hover:border-blue-500 cursor-pointer"
                onClick={() => isLoggedIn && navigate('/Announcements')}
              >
                <h3 className="text-xl font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-gray-300 mb-4">{item.content}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">{item.date}</span>
                  {!isLoggedIn && (
                    <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                      Sign in to view
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Why Choose NoteNinja?</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Transform your learning experience with our powerful AI-driven features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-6 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-${feature.color}-500 transition-all`}
            >
              <div className="mb-4">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* Demo Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-6">Experience AI-Powered Learning</h2>
                <p className="text-gray-400 mb-6 text-lg">
                  See how NoteNinja can transform your study sessions:
                </p>

                <div className="space-y-6 mb-8">
                  <div className="flex items-start">
                    <FaMedal className="h-6 w-6 text-blue-400 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl font-semibold mb-2">Semester-Specific Support</h4>
                      <p className="text-gray-400">
                        Get tailored assistance based on your current courses and academic level
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <FaBook className="h-6 w-6 text-purple-400 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl font-semibold mb-2">Integrated Course Materials</h4>
                      <p className="text-gray-400">
                        Access all your notes, quizzes, and resources in one place
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <FaChartLine className="h-6 w-6 text-green-400 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl font-semibold mb-2">Performance Tracking</h4>
                      <p className="text-gray-400">
                        Visualize your progress and identify areas for improvement
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/demo')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center"
                >
                  <FaRobot className="mr-2" />
                  Try Live Demo
                </button>
              </div>

              <div className="flex-1 w-full bg-gray-900 rounded-xl p-6 border border-gray-700">
                <div className="mock-chat space-y-4 min-h-[300px]">
                  <div className="bot-message p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                        <FaRobot className="text-white text-sm" />
                      </div>
                      <span className="text-blue-400 font-semibold">NoteNinja:</span>
                    </div>
                    <p className="ml-10">How can I assist with your studies today?</p>
                  </div>

                  <div className="user-message p-4 bg-gray-700 rounded-lg ml-8">
                    <div className="flex items-center mb-2">
                      <div className="bg-purple-500 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-semibold text-sm">Y</span>
                      </div>
                      <span className="text-purple-400 font-semibold">You:</span>
                    </div>
                    <p className="ml-10">{demoChats[activeDemo].question}</p>
                  </div>

                  <div className="bot-message p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                        <FaRobot className="text-white text-sm" />
                      </div>
                      <span className="text-blue-400 font-semibold">NoteNinja:</span>
                    </div>
                    <p className="ml-10">{demoChats[activeDemo].answer}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What Students Say</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Join thousands of students who transformed their learning experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((item) => (
            <motion.div
              key={item}
              whileHover={{ y: -10 }}
              className="bg-gray-800/80 border border-gray-700 rounded-2xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  {item}
                </div>
                <div>
                  <h4 className="font-bold text-white">Sarah Johnson</h4>
                  <p className="text-gray-400 text-sm">Computer Science, Semester 4</p>
                </div>
              </div>
              <p className="text-gray-300">
                "NoteNinja helped me understand complex algorithms through personalized explanations.
                My grades improved by 30% this semester!"
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-gray-300 mb-10">
            Join thousands of students achieving academic excellence with AI-powered assistance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(isLoggedIn ? '/student' : '/register')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300"
            >
              Try Demo First
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FaRobot className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                NoteNinja
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              AI-powered learning assistant for modern students
            </p>
            <div className="flex space-x-4">
              {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                <a key={social} href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">{social}</span>
                  <div className="bg-gray-800 w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="font-semibold">{social.charAt(0).toUpperCase()}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              {['Home', 'Features', 'Demo', 'Dashboard', 'Login'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-white">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2">
              {['Blog', 'Tutorials', 'Documentation', 'Support', 'FAQ'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-white">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contact Us</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                contact@noteninja.edu
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +1 (555) 123-4567
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
          <p>© 2024 NoteNinja Assistant. Empowering students with AI-driven education.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;