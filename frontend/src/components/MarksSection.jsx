import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const MarksSection = ({ filters }) => {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [studentsFromDB, setStudentsFromDB] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch students from database
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = getToken();
        const response = await axios.get("http://localhost:8000/marks/students", {
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
        
        // Initialize marks state with existing marks or zeros
        const initialMarks = {};
        for (const student of data.students || []) {
          try {
            // Fetch existing marks for this student and subject
            const marksResponse = await axios.get(
              `http://localhost:8000/marks/student/${student.usn}/subject/${filters.subject}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            
            initialMarks[student.id] = {
              ia1_marks: marksResponse.data.ia1_marks || 0,
              ia2_marks: marksResponse.data.ia2_marks || 0,
              quiz_marks: marksResponse.data.quiz_marks || 0,
              assignment_marks: marksResponse.data.assignment_marks || 0,
              seminar_marks: marksResponse.data.seminar_marks || 0,
              lab_ia_marks: marksResponse.data.lab_ia_marks || 0
            };
          } catch (error) {
            // If no marks found, initialize with zeros
            initialMarks[student.id] = {
              ia1_marks: 0,
              ia2_marks: 0,
              quiz_marks: 0,
              assignment_marks: 0,
              seminar_marks: 0,
              lab_ia_marks: 0
            };
          }
        }
        setMarks(initialMarks);
        
        console.log("🔍 Marks Debug:", {
          searchParams: { branch: filters.branch, year: filters.year, semester: filters.semester },
          foundInDB: data.found_in_db,
          studentCount: data.count,
          students: data.students
        });
        
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
        setStudentsFromDB(false);
      }
    };
    
    fetchStudents();
  }, [filters]);

  const handleMarksChange = (studentId, field, value) => {
    const numValue = parseInt(value) || 0;
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue
      }
    }));
  };

  const calculateTotal = (studentMarks) => {
    // Handle case where studentMarks is undefined
    if (!studentMarks) {
      return 0;
    }
    
    // IA1+IA2 converted to 25 total: (IA1 + IA2) * 0.5
    const iaTotal = ((studentMarks.ia1_marks || 0) + (studentMarks.ia2_marks || 0)) * 0.5;
    // Quiz+Assignment+Seminar total (max 25)
    const otherTotal = (studentMarks.quiz_marks || 0) + 
                      (studentMarks.assignment_marks || 0) + 
                      (studentMarks.seminar_marks || 0);
    // Lab IA is optional (additional)
    const labTotal = studentMarks.lab_ia_marks || 0;
    
    return iaTotal + otherTotal + labTotal;
  };

  const handleSubmitMarks = async () => {
    try {
      setLoading(true);
      const marksList = students.map(student => ({
        usn: student.usn,
        subject: filters.subject,
        ia1_marks: marks[student.id]?.ia1_marks || 0,
        ia2_marks: marks[student.id]?.ia2_marks || 0,
        quiz_marks: marks[student.id]?.quiz_marks || 0,
        assignment_marks: marks[student.id]?.assignment_marks || 0,
        seminar_marks: marks[student.id]?.seminar_marks || 0,
        lab_ia_marks: marks[student.id]?.lab_ia_marks || 0
      }));

      const token = getToken();
      await axios.post("http://localhost:8000/marks/bulk-entry", marksList, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert("Marks submitted successfully!");
    } catch (error) {
      console.error("Error submitting marks:", error);
      alert("Error submitting marks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    const clearedMarks = {};
    students.forEach(student => {
      clearedMarks[student.id] = {
        ia1_marks: 0,
        ia2_marks: 0,
        quiz_marks: 0,
        assignment_marks: 0,
        seminar_marks: 0,
        lab_ia_marks: 0
      };
    });
    setMarks(clearedMarks);
  };

  if (!studentsFromDB) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-100">
            Student Marks for {filters.subject.toUpperCase()}
          </h2>
          <div className="text-sm text-gray-400">
            {filters.branch.toUpperCase()} - Year {filters.year} - Semester {filters.semester}
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6">
          <h3 className="text-yellow-400 text-lg font-semibold mb-3">
            📋 No Students Found in Database
          </h3>
          <p className="text-gray-300 mb-4">
            No students found for {filters.branch.toUpperCase()} - Year {filters.year} - Semester {filters.semester}.
            Please upload students first using the Attendance section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-100">
          Student Marks for {filters.subject.toUpperCase()}
        </h2>
        <div className="text-sm text-gray-400">
          {filters.branch.toUpperCase()} - Year {filters.year} - Semester {filters.semester}
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-400">
        Total Students: {students.length}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse bg-gray-800 rounded-lg">
          <thead>
            <tr className="border-b border-gray-600 bg-gray-700">
              <th className="p-3 text-gray-300 font-semibold">Name</th>
              <th className="p-3 text-gray-300 font-semibold">USN</th>
              <th className="p-3 text-gray-300 font-semibold text-center">IA 1</th>
              <th className="p-3 text-gray-300 font-semibold text-center">IA 2</th>
              <th className="p-3 text-gray-300 font-semibold text-center">Quiz</th>
              <th className="p-3 text-gray-300 font-semibold text-center">Assignment</th>
              <th className="p-3 text-gray-300 font-semibold text-center">Seminar</th>
              <th className="p-3 text-gray-300 font-semibold text-center">Lab IA</th>
              <th className="p-3 text-gray-300 font-semibold text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="p-3 text-white font-medium">{student.name}</td>
                <td className="p-3 text-white">{student.usn}</td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={marks[student.id]?.ia1_marks || 0}
                    onChange={(e) => handleMarksChange(student.id, 'ia1_marks', e.target.value)}
                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={marks[student.id]?.ia2_marks || 0}
                    onChange={(e) => handleMarksChange(student.id, 'ia2_marks', e.target.value)}
                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={marks[student.id]?.quiz_marks || 0}
                    onChange={(e) => handleMarksChange(student.id, 'quiz_marks', e.target.value)}
                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={marks[student.id]?.assignment_marks || 0}
                    onChange={(e) => handleMarksChange(student.id, 'assignment_marks', e.target.value)}
                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={marks[student.id]?.seminar_marks || 0}
                    onChange={(e) => handleMarksChange(student.id, 'seminar_marks', e.target.value)}
                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Optional"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={marks[student.id]?.lab_ia_marks || 0}
                    onChange={(e) => handleMarksChange(student.id, 'lab_ia_marks', e.target.value)}
                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Optional"
                  />
                </td>
                <td className="p-3">
                  <div className="text-center font-semibold text-blue-400">
                    {calculateTotal(marks[student.id])}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSubmitMarks}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
        >
          {loading ? "Submitting..." : "Submit Marks"}
        </button>
        <button
          onClick={handleClearAll}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          Clear All
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">📋 Marks Entry Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <p><strong>IA1 & IA2:</strong> Combined total converted to 25 marks</p>
            <p><strong>Quiz + Assignment + Seminar:</strong> Combined total of 25 marks</p>
            <p><strong>Lab IA:</strong> Optional (additional marks)</p>
          </div>
          <div>
            <p><strong>Calculation:</strong> (IA1+IA2)×0.5 + Quiz+Assignment+Seminar + Lab IA</p>
            <p><strong>Total Maximum:</strong> 50 marks per subject</p>
            <p><strong>Example:</strong> IA1(20)+IA2(30)=25, Quiz(10)+Assignment(15)=25, Total=50</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksSection;
