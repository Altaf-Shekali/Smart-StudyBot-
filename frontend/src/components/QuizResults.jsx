import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const QuizResults = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all quizzes for selection
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get("http://localhost:8000/quizzes");
        setQuizzes(response.data);
      } catch (err) {
        setError("Failed to load quizzes");
        console.error(err);
      }
    };
    fetchQuizzes();
  }, []);

  // Fetch analytics for selected quiz
  const fetchAnalytics = async (quizId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:8000/quiz-analytics/${quizId}`);
      setAnalytics(response.data);
    } catch (err) {
      setError("Failed to load quiz analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    fetchAnalytics(quiz.id);
  };

  // Prepare data for Grade Distribution Pie Chart
  const getGradeChartData = () => {
    if (!analytics?.grade_distribution) return null;

    const grades = analytics.grade_distribution;
    const labels = Object.keys(grades).filter(grade => grades[grade] > 0);
    const data = labels.map(grade => grades[grade]);

    return {
      labels: labels.map(grade => `Grade ${grade}`),
      datasets: [
        {
          label: 'Students',
          data: data,
          backgroundColor: [
            '#10B981', // A - Green
            '#3B82F6', // B - Blue  
            '#F59E0B', // C - Yellow
            '#EF4444', // D - Red
            '#6B7280', // F - Gray
          ],
          borderColor: [
            '#059669',
            '#2563EB',
            '#D97706',
            '#DC2626',
            '#4B5563',
          ],
          borderWidth: 2,
          hoverOffset: 4
        }
      ]
    };
  };

  // Prepare data for Score Distribution Bar Chart
  const getScoreChartData = () => {
    if (!analytics?.score_distribution) return null;

    const scores = analytics.score_distribution;
    const sortedScores = Object.keys(scores).sort((a, b) => parseInt(a) - parseInt(b));
    const data = sortedScores.map(score => scores[score]);

    return {
      labels: sortedScores.map(score => `${score}/${analytics.max_score}`),
      datasets: [
        {
          label: 'Number of Students',
          data: data,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#E5E7EB',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#374151',
        borderWidth: 1
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9CA3AF',
          stepSize: 1
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      },
      x: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            Quiz Results Analytics
          </h1>
          <p className="text-gray-400">View detailed analytics and score distributions for your quizzes</p>
        </div>

        {error && (
          <div className="bg-red-800/20 border border-red-600 text-red-300 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Quiz Selection */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select a Quiz</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => handleQuizSelect(quiz)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedQuiz?.id === quiz.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                }`}
              >
                <h3 className="text-white font-medium mb-2">{quiz.title}</h3>
                <p className="text-gray-400 text-sm mb-1">Subject: {quiz.subject}</p>
                <p className="text-gray-400 text-sm">Questions: {quiz.questions?.length || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Display */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading analytics...</p>
          </div>
        )}

        {analytics && !loading && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Attempts</p>
                    <p className="text-3xl font-bold">{analytics.total_attempts}</p>
                  </div>
                  <div className="text-4xl opacity-80">📊</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Students Attempted</p>
                    <p className="text-3xl font-bold">{analytics.students_attempted}</p>
                  </div>
                  <div className="text-4xl opacity-80">👥</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Average Score</p>
                    <p className="text-3xl font-bold">{analytics.average_score}/{analytics.max_score}</p>
                  </div>
                  <div className="text-4xl opacity-80">📈</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Average %</p>
                    <p className="text-3xl font-bold">
                      {Math.round((analytics.average_score / analytics.max_score) * 100)}%
                    </p>
                  </div>
                  <div className="text-4xl opacity-80">🎯</div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            {analytics.total_attempts > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Grade Distribution Pie Chart */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">🥧</span>
                    Grade Distribution
                  </h3>
                  <div className="h-80">
                    {getGradeChartData() && (
                      <Pie data={getGradeChartData()} options={chartOptions} />
                    )}
                  </div>
                </div>

                {/* Score Distribution Bar Chart */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">📊</span>
                    Score Distribution
                  </h3>
                  <div className="h-80">
                    {getScoreChartData() && (
                      <Bar data={getScoreChartData()} options={barOptions} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Results Table */}
            {analytics.attempts_data && analytics.attempts_data.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">📋</span>
                  Detailed Results
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-gray-300 font-medium py-3 px-4">Student Name</th>
                        <th className="text-gray-300 font-medium py-3 px-4">Score</th>
                        <th className="text-gray-300 font-medium py-3 px-4">Percentage</th>
                        <th className="text-gray-300 font-medium py-3 px-4">Grade</th>
                        <th className="text-gray-300 font-medium py-3 px-4">Attempted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.attempts_data.map((attempt, index) => {
                        const getGrade = (percentage) => {
                          if (percentage >= 90) return { grade: 'A', color: 'text-green-400' };
                          if (percentage >= 80) return { grade: 'B', color: 'text-blue-400' };
                          if (percentage >= 70) return { grade: 'C', color: 'text-yellow-400' };
                          if (percentage >= 60) return { grade: 'D', color: 'text-orange-400' };
                          return { grade: 'F', color: 'text-red-400' };
                        };
                        
                        const gradeInfo = getGrade(attempt.percentage);
                        
                        return (
                          <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="text-white py-3 px-4">{attempt.student_name}</td>
                            <td className="text-gray-300 py-3 px-4">
                              {attempt.score}/{analytics.max_score}
                            </td>
                            <td className="text-gray-300 py-3 px-4">{attempt.percentage}%</td>
                            <td className={`py-3 px-4 font-semibold ${gradeInfo.color}`}>
                              {gradeInfo.grade}
                            </td>
                            <td className="text-gray-400 py-3 px-4">
                              {new Date(attempt.attempted_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analytics.total_attempts === 0 && (
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Attempts Yet</h3>
                <p className="text-gray-400">This quiz hasn't been attempted by any students yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResults;
