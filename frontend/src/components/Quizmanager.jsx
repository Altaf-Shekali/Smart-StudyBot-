import React, { useState, useEffect } from "react";
import axios from "axios";
import QuizGenerator from "./QuizGenerator";

const QuizManager = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");

  const [newQuiz, setNewQuiz] = useState({
    title: "",
    description: "",
    dueDate: "",
    questions: [{ text: "", options: ["", ""], correctOption: 0 }]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Fetch quizzes when selection changes
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!branch || !year || !semester || !subject) return;
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:8000/quizzes/${semester}`, {
          params: { branch, year, subject }
        });
        setQuizzes(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [branch, year, semester, subject]);

  const handleAddQuestion = () => {
    setNewQuiz({
      ...newQuiz,
      questions: [...newQuiz.questions, { text: "", options: ["", ""], correctOption: 0 }]
    });
  };

  const handleAddOption = (qIndex) => {
    if (newQuiz.questions[qIndex].options.length >= 6) return;
    const updated = [...newQuiz.questions];
    updated[qIndex].options.push("");
    setNewQuiz({ ...newQuiz, questions: updated });
  };

  const handleRemoveOption = (qIndex, oIndex) => {
    if (newQuiz.questions[qIndex].options.length <= 2) return;
    const updated = [...newQuiz.questions];
    updated[qIndex].options.splice(oIndex, 1);
    if (updated[qIndex].correctOption >= oIndex) {
      updated[qIndex].correctOption = Math.max(0, updated[qIndex].correctOption - 1);
    }
    setNewQuiz({ ...newQuiz, questions: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!branch || !year || !semester || !subject) return setError("Please select branch, year, semester, and subject");
    if (!newQuiz.title.trim()) return setError("Title is required");
    if (!newQuiz.dueDate) return setError("Due date is required");

    for (let i = 0; i < newQuiz.questions.length; i++) {
      const q = newQuiz.questions[i];
      if (!q.text.trim()) return setError(`Question ${i + 1} text is required`);
      if (new Set(q.options.map((opt) => opt.trim().toLowerCase())).size !== q.options.length)
        return setError(`Question ${i + 1} has duplicate options`);
      for (let opt of q.options) {
        if (!opt.trim()) return setError("All options must be filled");
      }
    }

    try {
      const payload = {
        title: newQuiz.title,
        description: newQuiz.description,
        dueDate: new Date(newQuiz.dueDate).toISOString(),
        branch,
        year: String(year),        // Ensure string type
        semester: String(semester), // Ensure string type
        subject,
        questions: newQuiz.questions
      };
      
      console.log("DEBUG: Creating quiz with payload:", payload); // Debug log
      const res = await axios.post("http://localhost:8000/quizzes", payload);
      setQuizzes([res.data, ...quizzes]);
      setNewQuiz({
        title: "",
        description: "",
        dueDate: "",
        questions: [{ text: "", options: ["", ""], correctOption: 0 }]
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create quiz");
    }
  };

  const handleAIQuestionsGenerated = (generatedQuestions) => {
    setNewQuiz(prev => ({
      ...prev,
      title: `${subject} Quiz - ${generatedQuestions.length} Questions`,
      description: `AI-generated quiz for ${subject}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 7 days from now
      questions: generatedQuestions.map(q => ({
        text: q.text,
        options: q.options,
        correctOption: q.correctOption
      }))
    }));
    setShowAIGenerator(false);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
    } catch (err) {
      setError("Failed to delete quiz: " + (err.response?.data?.detail || err.message));
      console.error("Quiz delete error:", err);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-100 mb-4">Create New Quiz</h2>
      
      {/* Dropdown Section */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="p-2 bg-gray-700 text-white rounded">
          <option value="">Select Branch</option>
          <option value="CSE">CSE</option>
          <option value="ECE">ECE</option>
          <option value="MECH">Mechanical</option>
          <option value="CIVIL">Civil</option>
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="p-2 bg-gray-700 text-white rounded">
          <option value="">Select Year</option>
          {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="p-2 bg-gray-700 text-white rounded">
          <option value="">Select Semester</option>
          {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input 
          type="text" 
          placeholder="Subject" 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)} 
          className="p-2 bg-gray-700 text-white rounded"
        />
      </div>

      {error && <div className="bg-red-800 text-red-100 p-3 rounded-lg mb-4">{error}</div>}

      {/* AI Quiz Generator */}
      {showAIGenerator && (
        <QuizGenerator 
          onQuestionsGenerated={handleAIQuestionsGenerated}
          filters={{ branch, year, semester, subject }}
        />
      )}

      <form onSubmit={handleSubmit} className="bg-gray-700 p-6 rounded-xl mb-8">
        {/* AI Generator Toggle */}
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Quiz Questions</h3>
          <button
            type="button"
            onClick={() => setShowAIGenerator(!showAIGenerator)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
          >
            <span>🤖</span>
            {showAIGenerator ? 'Hide AI Generator' : 'Generate with AI'}
          </button>
        </div>
        {/* Quiz Title */}
        <input
          type="text"
          placeholder="Quiz Title"
          value={newQuiz.title}
          onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
          className="mb-3 w-full p-2 bg-gray-600 text-white rounded"
        />
        {/* Description */}
        <textarea
          placeholder="Description"
          value={newQuiz.description}
          onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
          className="mb-3 w-full p-2 bg-gray-600 text-white rounded"
        />
        {/* Due Date */}
        <input
          type="datetime-local"
          value={newQuiz.dueDate}
          onChange={(e) => setNewQuiz({ ...newQuiz, dueDate: e.target.value })}
          className="mb-6 w-full p-2 bg-gray-600 text-white rounded"
        />

        {/* Questions */}
        {newQuiz.questions.map((q, qIndex) => (
          <div key={qIndex} className="mb-6 p-4 bg-gray-600 rounded-lg">
            <textarea
              value={q.text}
              onChange={(e) => {
                const updated = [...newQuiz.questions];
                updated[qIndex].text = e.target.value;
                setNewQuiz({ ...newQuiz, questions: updated });
              }}
              placeholder="Question Text"
              className="w-full p-2 bg-gray-500 text-white rounded mb-3"
            />
            {q.options.map((option, oIndex) => (
              <div key={oIndex} className="flex mb-2">
                <input
                  type="radio"
                  checked={q.correctOption === oIndex}
                  onChange={() => {
                    const updated = [...newQuiz.questions];
                    updated[qIndex].correctOption = oIndex;
                    setNewQuiz({ ...newQuiz, questions: updated });
                  }}
                  className="mr-2"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const updated = [...newQuiz.questions];
                    updated[qIndex].options[oIndex] = e.target.value;
                    setNewQuiz({ ...newQuiz, questions: updated });
                  }}
                  className="flex-1 p-2 bg-gray-500 text-white rounded"
                />
                <button
                  type="button"
                  disabled={q.options.length <= 2}
                  onClick={() => handleRemoveOption(qIndex, oIndex)}
                  className="ml-2 text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddOption(qIndex)}
              disabled={q.options.length >= 6}
              className="text-sm bg-gray-500 text-white px-2 py-1 rounded"
            >
              + Add Option
            </button>
          </div>
        ))}

        <div className="flex gap-4">
          <button type="button" onClick={handleAddQuestion} className="bg-gray-600 text-white px-4 py-2 rounded">
            + Add Question
          </button>
          <button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded">
            Create Quiz
          </button>
        </div>
      </form>

      {/* Existing Quizzes Section */}
      {quizzes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">Existing Quizzes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-gray-700 p-4 rounded-xl border border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-white flex-1 mr-2">{quiz.title}</h3>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all"
                    title="Delete quiz"
                  >
                    🗑️
                  </button>
                </div>
                <p className="text-gray-300 text-sm mb-2">{quiz.description}</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <p><span className="font-medium">Subject:</span> {quiz.subject}</p>
                  <p><span className="font-medium">Due:</span> {new Date(quiz.dueDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Questions:</span> {quiz.questions?.length || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManager;
