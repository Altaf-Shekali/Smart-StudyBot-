import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';

const StudentAttendance = () => {
  const [user, setUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
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
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        if (!user?.usn) {
          setError("USN not found in user profile");
          return;
        }

        const response = await axios.get(`http://localhost:8000/attendance/student/${user.usn}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setAttendanceData(response.data);
        setError(null);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setError("Failed to fetch attendance data");
      } finally {
        setLoading(false);
      }
    };

    if (user?.usn) {
      fetchAttendance();
    }
  }, [user]);

  const getAttendanceColor = (percentage) => {
    if (percentage >= 85) return 'text-green-400';
    if (percentage >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAttendanceStatus = (percentage) => {
    if (percentage >= 85) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 65) return 'Warning';
    return 'Critical';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-300">Loading attendance data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <h3 className="text-red-400 text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { student_info, attendance_summary } = attendanceData || {};
  const overallAttendance = attendance_summary?.length > 0 
    ? attendance_summary.reduce((acc, curr) => acc + curr.percentage, 0) / attendance_summary.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                My Attendance
              </h1>
              <p className="text-gray-400 mt-1">Track your attendance across all subjects</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Overall Attendance</div>
              <div className={`text-2xl font-bold ${getAttendanceColor(overallAttendance)}`}>
                {overallAttendance.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {getAttendanceStatus(overallAttendance)}
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

        {/* Attendance Summary */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-6">Subject-wise Attendance</h2>
          
          {attendance_summary?.length > 0 ? (
            <div className="space-y-4">
              {attendance_summary.map((subject, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold text-lg">{subject.subject}</h3>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getAttendanceColor(subject.percentage)}`}>
                        {subject.percentage}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {getAttendanceStatus(subject.percentage)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-gray-400">Total Classes</div>
                      <div className="text-white font-semibold text-lg">{subject.total_classes}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Present</div>
                      <div className="text-green-400 font-semibold text-lg">{subject.present_count}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Absent</div>
                      <div className="text-red-400 font-semibold text-lg">{subject.absent_count}</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          subject.percentage >= 85 ? 'bg-green-500' :
                          subject.percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(subject.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Attendance Requirement Alert */}
                  {subject.percentage < 75 && (
                    <div className="mt-3 p-3 bg-red-900/30 border border-red-500 rounded-lg">
                      <div className="text-red-400 text-sm font-medium">
                        ⚠️ Below 75% requirement
                      </div>
                      <div className="text-red-300 text-xs mt-1">
                        You need to attend {Math.ceil((0.75 * subject.total_classes - subject.present_count) / 0.25)} more classes to reach 75%
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No attendance records found</div>
              <p className="text-gray-500 text-sm">
                Your attendance will appear here once your teachers start marking attendance.
              </p>
            </div>
          )}
        </div>

        {/* Attendance Guidelines */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Attendance Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">85%+ : Excellent (Eligible for all exams)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-300">75-84% : Good (Meets minimum requirement)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Below 75% : Critical (May affect exam eligibility)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
