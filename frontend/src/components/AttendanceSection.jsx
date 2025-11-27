import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const AttendanceSection = ({ filters }) => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState(null);
  const [studentsFromDB, setStudentsFromDB] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Fetch students from database first
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = getToken();
        const response = await axios.get("http://localhost:8000/attendance/students", {
          params: {
            branch: filters.branch,
            year: filters.year,
            semester: filters.semester
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = response.data;
        setStudents(data.students || []);
        setStudentsFromDB(data.found_in_db);
        
        // Debug logging
        console.log("🔍 Attendance Debug:", {
          searchParams: { branch: filters.branch, year: filters.year, semester: filters.semester },
          foundInDB: data.found_in_db,
          studentCount: data.count,
          totalInDB: data.debug_info?.total_students_in_db,
          students: data.students
        });
        
        if (data.found_in_db) {
          console.log(`✅ Found ${data.count} students in database`);
        } else {
          console.log(`❌ No students found for ${filters.branch.toUpperCase()}-Year${filters.year}-Sem${filters.semester}`);
          if (data.debug_info?.total_students_in_db > 0) {
            console.log(`📊 Total students in DB: ${data.debug_info.total_students_in_db}`);
          }
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
        setStudentsFromDB(false);
      }
    };
    
    fetchStudents();
  }, [filters]);

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }
    
    try {
      setUploadStatus("uploading");
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("branch", filters.branch);
      formData.append("year", filters.year);
      formData.append("semester", filters.semester);

      const response = await axios.post("http://localhost:8000/attendance/upload-students", formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const result = response.data;
      setUploadStatus("success");
      
      alert(`Upload successful!\nCreated: ${result.summary.created} students\nUpdated: ${result.summary.updated} students\nErrors: ${result.summary.errors}`);
      
      // Refresh students list
      window.location.reload();
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus("error");
      alert("Error uploading file. Please check the format and try again.");
    }
  };

  const handleMark = async () => {
    try {
      const attendanceList = students.map(student => ({
        usn: student.usn,
        subject: filters.subject,
        status: attendance[student.id] || "Absent",
        date: date
      }));

      const token = getToken();
      await axios.post("http://localhost:8000/attendance/bulk-mark", attendanceList, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert("Attendance marked successfully!");
      setAttendance({}); // Reset attendance state
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Error marking attendance. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-100">
          Attendance for {filters.subject.toUpperCase()}
        </h2>
        <div className="text-sm text-gray-400">
          {filters.branch.toUpperCase()} - Year {filters.year} - Semester {filters.semester}
        </div>
      </div>

      {!studentsFromDB ? (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6">
          <h3 className="text-yellow-400 text-lg font-semibold mb-3">
            📋 No Students Found in Database
          </h3>
          <p className="text-gray-300 mb-4">
            No students found for {filters.branch.toUpperCase()} - Year {filters.year} - Semester {filters.semester}.
            Please upload an Excel/CSV file with student details.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Upload Excel/CSV file (Required columns: USN, Name)
              </label>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files[0])} 
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
              />
            </div>
            
            <button
              onClick={handleFileUpload}
              disabled={!file || uploadStatus === "uploading"}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
            >
              {uploadStatus === "uploading" ? "Uploading..." : "Upload Students"}
            </button>
            
            {uploadStatus === "error" && (
              <p className="text-red-400 text-sm">Upload failed. Please check file format.</p>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400 font-semibold mb-1">File Format Requirements:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Excel (.xlsx, .xls) or CSV (.csv) format</li>
              <li>• Required columns: <strong>USN</strong>, <strong>Name</strong></li>
              <li>• Example: USN: "1MS20CS001", Name: "John Doe"</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-4">
            <label className="text-gray-300">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-2 rounded bg-gray-700 text-white border border-gray-600"
            />
            <div className="text-sm text-gray-400">
              Total Students: {students.length} {studentsFromDB ? "(from database)" : "(uploaded)"}
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="p-2 text-gray-300">Name</th>
                <th className="p-2 text-gray-300">USN</th>
                <th className="p-2 text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-700">
                  <td className="p-2 text-white">{s.name}</td>
                  <td className="p-2 text-white">{s.usn}</td>
                  <td className="p-2">
                    <select
                      value={attendance[s.id] || "Absent"}
                      onChange={(e) =>
                        setAttendance({ ...attendance, [s.id]: e.target.value })
                      }
                      className="bg-gray-700 text-white px-2 py-1 rounded"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleMark}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition-all"
            >
              Submit Attendance
            </button>
            <button
              onClick={() => setAttendance({})}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              Clear All
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSection;
