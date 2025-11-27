import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';

const StudentMarks = () => {
  const [user, setUser] = useState(null);
  const [marksData, setMarksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getToken();
        const response = await axios.get("http://localhost:8000/api/profile", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError("Failed to fetch user profile");
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        if (!user?.usn) {
          setError("USN not found in user profile");
          return;
        }

        const response = await axios.get(`http://localhost:8000/marks/student/${user.usn}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setMarksData(response.data);
        setError(null);
      } catch (error) {
        console.error("Error fetching marks:", error);
        setError("Failed to fetch marks data");
      } finally {
        setLoading(false);
      }
    };

    if (user?.usn) {
      fetchMarks();
    }
  }, [user]);

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    return 'F';
  };

  const getPerformanceStatus = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Very Good';
    if (percentage >= 70) return 'Good';
    if (percentage >= 60) return 'Satisfactory';
    if (percentage >= 50) return 'Pass';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-300">Loading marks data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <h3 className="text-red-400 text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { student_info, marks_summary } = marksData || {};
  const overallPercentage = marks_summary?.length > 0 
    ? marks_summary.reduce((acc, curr) => {
        // Calculate percentage based on new structure: IA conversion + other components
        const iaTotal = (curr.ia1_marks + curr.ia2_marks) * 0.5; // Convert to 25
        const otherTotal = curr.quiz_marks + curr.assignment_marks + curr.seminar_marks; // Max 25
        const labTotal = curr.lab_ia_marks || 0; // Optional
        const actualTotal = iaTotal + otherTotal + labTotal;
        const percentage = actualTotal > 0 ? (actualTotal / 50) * 100 : 0;
        return acc + percentage;
      }, 0) / marks_summary.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                My Academic Performance
              </h1>
              <p className="text-gray-400 mt-1">Track your marks across all subjects</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Overall Performance</div>
              <div className={`text-2xl font-bold ${getGradeColor(overallPercentage)}`}>
                {overallPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                Grade: {getGrade(overallPercentage)} - {getPerformanceStatus(overallPercentage)}
              </div>
            </div>
          </div>
        </div>

        {/* Student Info */}
        {student_info && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Student Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Name</div>
                <div className="text-white font-medium">{student_info.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">USN</div>
                <div className="text-white font-medium">{student_info.usn}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Branch</div>
                <div className="text-white font-medium">{student_info.branch?.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Year & Semester</div>
                <div className="text-white font-medium">Year {student_info.year}, Sem {student_info.semester}</div>
              </div>
            </div>
          </div>
        )}

        {/* Marks Summary */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-6">Subject-wise Marks</h2>
          
          {marks_summary?.length > 0 ? (
            <div className="space-y-6">
              {marks_summary.map((subject, index) => {
                // Calculate actual total using new structure
                const iaTotal = (subject.ia1_marks + subject.ia2_marks) * 0.5; // Convert to 25
                const otherTotal = subject.quiz_marks + subject.assignment_marks + subject.seminar_marks; // Max 25
                const labTotal = subject.lab_ia_marks || 0; // Optional
                const actualTotal = iaTotal + otherTotal + labTotal;
                const percentage = actualTotal > 0 ? (actualTotal / 50) * 100 : 0;
                return (
                  <div key={index} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold text-xl">{subject.subject}</h3>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                          {actualTotal.toFixed(1)}/50
                        </div>
                        <div className="text-sm text-gray-400">
                          {percentage.toFixed(1)}% - Grade: {getGrade(percentage)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Marks Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">IA 1</div>
                        <div className="text-white font-semibold text-lg">{subject.ia1_marks}</div>
                      </div>
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">IA 2</div>
                        <div className="text-white font-semibold text-lg">{subject.ia2_marks}</div>
                      </div>
                      <div className="text-center bg-blue-600 rounded-lg p-3">
                        <div className="text-gray-200 text-xs">IA Total (25)</div>
                        <div className="text-white font-semibold text-lg">{((subject.ia1_marks + subject.ia2_marks) * 0.5).toFixed(1)}</div>
                      </div>
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">Quiz</div>
                        <div className="text-white font-semibold text-lg">{subject.quiz_marks}</div>
                      </div>
                      <div className="text-center bg-gray-600 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">Assignment</div>
                        <div className="text-white font-semibold text-lg">{subject.assignment_marks}</div>
                      </div>
                      {subject.seminar_marks > 0 && (
                        <div className="text-center bg-gray-600 rounded-lg p-3">
                          <div className="text-gray-400 text-xs">Seminar</div>
                          <div className="text-white font-semibold text-lg">{subject.seminar_marks}</div>
                        </div>
                      )}
                      {subject.lab_ia_marks > 0 && (
                        <div className="text-center bg-gray-600 rounded-lg p-3">
                          <div className="text-gray-400 text-xs">Lab IA</div>
                          <div className="text-white font-semibold text-lg">{subject.lab_ia_marks}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-600 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            percentage >= 90 ? 'bg-green-500' :
                            percentage >= 80 ? 'bg-blue-500' :
                            percentage >= 70 ? 'bg-yellow-500' :
                            percentage >= 60 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Performance Alert */}
                    {percentage < 60 && (
                      <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg">
                        <div className="text-red-400 text-sm font-medium">
                          ⚠️ Below satisfactory performance
                        </div>
                        <div className="text-red-300 text-xs mt-1">
                          Focus on improving your performance in this subject.
                        </div>
                      </div>
                    )}
                    
                    {percentage >= 90 && (
                      <div className="p-3 bg-green-900/30 border border-green-500 rounded-lg">
                        <div className="text-green-400 text-sm font-medium">
                          🎉 Excellent performance!
                        </div>
                        <div className="text-green-300 text-xs mt-1">
                          Keep up the great work!
                        </div>
                      </div>
                    )}
                    
                    {subject.updated_at && (
                      <div className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(subject.updated_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No marks records found</div>
              <p className="text-gray-500 text-sm">
                Your marks will appear here once your teachers start entering marks.
              </p>
            </div>
          )}
        </div>

        {/* Grading Guidelines */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Grading Scale</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">90-100% : A+ (Excellent)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300">80-89% : A (Very Good)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">70-79% : B+ (Good)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-300">60-69% : B (Satisfactory)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">50-59% : C (Pass)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Below 50% : F (Fail)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMarks;
