import React, { useState, useEffect } from "react";
import axios from "axios";

const SubjectSelector = ({ branch, year, semester }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    if (branch && year && semester) {
      setLoading(true);
      axios
        .get("http://localhost:8000/get-subjects", {
          params: { branch, year, semester },
        })
        .then((res) => {
          setSubjects(res.data.subjects || []);
        })
        .catch((err) => {
          console.error("Error fetching subjects:", err);
          setSubjects([]);
        })
        .finally(() => setLoading(false));
    }
  }, [branch, year, semester]);

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Subjects
      </label>

      {loading ? (
        <div className="text-blue-600 font-semibold">Loading subjects...</div>
      ) : subjects.length > 0 ? (
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full p-2 border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">-- Select Subject --</option>
          {subjects.map((subject, idx) => (
            <option key={idx} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-red-600 font-medium">No subjects found.</div>
      )}
    </div>
  );
};

export default SubjectSelector;
