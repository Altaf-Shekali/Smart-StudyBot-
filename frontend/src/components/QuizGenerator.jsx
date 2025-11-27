import React, { useState } from 'react';
import axios from 'axios';

const QuizGenerator = ({ onQuestionsGenerated, filters }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: filters?.subject || '',
    topic: '',
    difficulty: 'medium',
    num_questions: 5
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateQuiz = async () => {
    try {
      setLoading(true);
      
      const requestData = {
        ...formData,
        branch: filters.branch,
        year: filters.year,
        semester: filters.semester
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/quiz/generate`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        onQuestionsGenerated(response.data.questions);
      } else {
        alert('Failed to generate quiz questions');
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      alert('Error generating quiz: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">🤖</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">AI Quiz Generator</h2>
          <p className="text-gray-400 text-sm">Generate quiz questions automatically using AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Subject
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="e.g., Mathematics, Physics"
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Topic (Optional)
          </label>
          <input
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleInputChange}
            placeholder="e.g., Calculus, Thermodynamics"
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Difficulty Level
          </label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Number of Questions
          </label>
          <select
            name="num_questions"
            value={formData.num_questions}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value={3}>3 Questions</option>
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          <p>🎯 AI will generate questions based on your inputs</p>
          <p>📝 Questions will be automatically formatted for your quiz</p>
        </div>
        
        <button
          onClick={generateQuiz}
          disabled={loading || !formData.subject}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-all flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <span>🚀</span>
              Generate Quiz
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="mt-4 bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div className="text-gray-300">
              <p className="font-medium">AI is generating your quiz...</p>
              <p className="text-sm text-gray-400">This may take 30-60 seconds</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizGenerator;
