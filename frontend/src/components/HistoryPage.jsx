import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await axios.get('http://localhost:8000/query/history', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`  // Changed to 'token'
          }
        });
        setHistory(response.data);
      } catch (error) {
        toast.error('Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Query History
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No search history found
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div 
                  key={index}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-blue-400">
                      {entry.branch} • {entry.year} • {entry.semester}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-100">{entry.question}</h3>
                  </div>
                  
                  <div className="bg-gray-800 rounded p-3">
                    <pre className="whitespace-pre-wrap text-gray-300 text-sm">
                      {entry.answer}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default HistoryPage;