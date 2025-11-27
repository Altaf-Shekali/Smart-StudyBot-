import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";
import { getToken } from "../utils/auth";

const Quizzes = () => {
  const { user, userRole } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch user-specific quizzes with attempt status
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          console.error("No authentication token found");
          return;
        }

        if (userRole === "student") {
          // Fetch user-specific quizzes
          const res = await axios.get("http://localhost:8000/quizzes/user", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setQuizzes(res.data);
        } else {
          // For teachers, fetch all quizzes
          const res = await axios.get("http://localhost:8000/quizzes");
          setQuizzes(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userRole]);

  const takeQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    setQuizResult(null);
  };

  const submitQuiz = async () => {
    // Validate user data before submission
    if (!user?.id) {
      console.error("User ID not available:", user);
      alert("Error: User information not available. Please try logging in again.");
      return;
    }

    let score = 0;
    selectedQuiz.questions.forEach((q, i) => {
      if (answers[i] === q.options[q.correctOption]) score++;
    });

    const resultData = {
      quiz_id: selectedQuiz.id,
      student_id: user.id,
      student_name: user.name || "Unknown Student",
      score,
      total: selectedQuiz.questions.length,
      answers
    };

    console.log("Submitting quiz data:", resultData); // Debug log

    try {
      const token = getToken();
      if (!token) {
        alert("Error: Authentication token not found. Please log in again.");
        return;
      }

      await axios.post("http://localhost:8000/quiz-attempts", resultData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setQuizResult({
        score,
        total: selectedQuiz.questions.length,
        title: selectedQuiz.title
      });
      setSelectedQuiz(null);

      // Refresh quizzes to update attempt status
      const res = await axios.get("http://localhost:8000/quizzes/user", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(res.data);
    } catch (err) {
      console.error("Failed to save quiz attempt:", err);
      console.error("Error response:", err.response?.data);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
      alert(`Error saving quiz attempt: ${errorMessage}`);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
    } catch (err) {
      console.error("Failed to delete quiz:", err);
      alert("Error deleting quiz: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            {userRole === "student" ? "My Quizzes" : "All Quizzes"}
          </h1>
          {userRole === "student" && user && (
            <p className="text-gray-400">
              Quizzes for {user.branch?.toUpperCase()} - Year {user.year} - Semester {user.semester}
            </p>
          )}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading quizzes...</p>
          </div>
        )}

        {!loading && quizzes.length === 0 && (
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">No quizzes available for your branch and year.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white flex-1 mr-2">{quiz.title}</h3>
                <div className="flex items-center gap-2">
                  {quiz.has_attempted && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      Attempted
                    </span>
                  )}
                  {userRole === "teacher" && (
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all"
                      title="Delete quiz"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-300 mb-4">{quiz.description}</p>

              <div className="space-y-2 mb-4">
                <p className="text-gray-400 text-sm">
                  <span className="font-medium">Subject:</span> {quiz.subject}
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="font-medium">Semester:</span> {quiz.semester}
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="font-medium">Due:</span> {new Date(quiz.dueDate).toLocaleDateString()}
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="font-medium">Questions:</span> {quiz.questions.length}
                </p>

                {quiz.has_attempted && (
                  <div className="bg-gray-700 rounded-lg p-3 mt-3">
                    <p className="text-green-400 text-sm font-medium">
                      Best Score: {quiz.best_score}/{quiz.questions.length}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Total Attempts: {quiz.total_attempts}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => takeQuiz(quiz)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${quiz.has_attempted
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  }`}
              >
                {quiz.has_attempted ? "Retake Quiz" : "Take Quiz"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz Taking View */}
      {selectedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">{selectedQuiz.title}</h3>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {selectedQuiz.questions.map((q, i) => (
                <div key={i} className="bg-gray-700 rounded-lg p-4">
                  <p className="text-white text-lg font-medium mb-3">
                    {i + 1}. {q.text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => (
                      <label key={idx} className="flex items-center p-3 bg-gray-600 rounded-lg hover:bg-gray-500 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name={`q-${i}`}
                          value={opt}
                          checked={answers[i] === opt}
                          onChange={() => setAnswers({ ...answers, [i]: opt })}
                          className="mr-3 text-blue-500"
                        />
                        <span className="text-gray-200">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-600">
              <p className="text-gray-400">
                Answered: {Object.keys(answers).length} / {selectedQuiz.questions.length}
              </p>
              <button
                onClick={submitQuiz}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {quizResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h3>
              <p className="text-gray-400">{quizResult.title}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-3xl font-bold text-green-400 mb-2">
                {quizResult.score} / {quizResult.total}
              </p>
              <p className="text-gray-300">
                {Math.round((quizResult.score / quizResult.total) * 100)}% Score
              </p>
            </div>

            <button
              onClick={() => setQuizResult(null)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quizzes;
