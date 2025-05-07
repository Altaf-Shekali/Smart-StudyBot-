import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaGraduationCap, FaChartLine, FaComments } from 'react-icons/fa';
import { useAuth } from '../Context/AuthContext'; // 👈 Make sure the path is correct

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth(); // 👈 Access auth state

  const handleStartLearning = () => {
    if (!isLoggedIn) {
      navigate('/login'); // 👈 Redirect to login if not logged in
    } else {
      navigate('/student'); // 👈 Proceed if logged in
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8 inline-block bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-2xl">
            <FaRobot className="h-12 w-12 text-white animate-bounce" />
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            NoteNinja Assistant
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Your 24/7 Intelligent Learning Companion. Get instant academic support, 
            course material access, and personalized learning guidance powered by AI.
          </p>
          <button 
            onClick={handleStartLearning} // 👈 Hooked auth logic here
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
          >
            Start Learning Now
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="feature-card p-6 rounded-2xl bg-gray-800 border border-gray-700 hover:border-blue-500 transition-all">
            <FaGraduationCap className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-bold mb-3">Smart Course Support</h3>
            <p className="text-gray-400">
              Instant answers to course-related questions with verified sources 
              and textbook references
            </p>
          </div>
          
          <div className="feature-card p-6 rounded-2xl bg-gray-800 border border-gray-700 hover:border-purple-500 transition-all">
            <FaChartLine className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-bold mb-3">History Tracking</h3>
            <p className="text-gray-400">
              Detailed analytics and personalized recommendations 
              to optimize your learning journey
            </p>
          </div>
          
          <div className="feature-card p-6 rounded-2xl bg-gray-800 border border-gray-700 hover:border-green-500 transition-all">
            <FaComments className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-2xl font-bold mb-3">Natural Conversations</h3>
            <p className="text-gray-400">
              Advanced NLP-powered interactions that understand context 
              and learning preferences
            </p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-6">Experience AI-Powered Learning</h2>
                <p className="text-gray-400 mb-6">
                  Interact with our demo chatbot to see how NoteNinja can help with:
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Instant course material queries
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    General problem solving
                  </li>
                  <li className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    Concept explanation from textbooks.
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/demo')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg"
                >
                  Try Live Demo
                </button>
              </div>
              <div className="flex-1 bg-gray-900 rounded-xl p-6 border border-gray-700">
                {/* Mock Chat Interface */}
                <div className="mock-chat space-y-4">
                  <div className="bot-message p-4 bg-gray-800 rounded-lg">
                    <span className="text-blue-400 font-semibold">NoteNinja:</span> 
                    <span className="ml-2">How can I help you today?</span>
                  </div>
                  <div className="user-message p-4 bg-gray-700 rounded-lg">
                    <span className="text-purple-400 font-semibold">You:</span> 
                    <span className="ml-2">Explain quantum computing basics</span>
                  </div>
                  <div className="bot-message p-4 bg-gray-800 rounded-lg">
                    <span className="text-blue-400 font-semibold">NoteNinja:</span> 
                    <span className="ml-2">According to course materials, Quantum computing uses quantum bits...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 NoteNinja Assistant. Empowering students with AI-driven education.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;