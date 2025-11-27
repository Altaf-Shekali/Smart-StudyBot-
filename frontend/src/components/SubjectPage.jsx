import React, { useState } from "react";
import SubjectSelector from "./SubjectSelector";

const SubjectPage = () => {
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [showSubjects, setShowSubjects] = useState(false);

  const handleSearch = () => {
    if (branch && year && semester) {
      setShowSubjects(true);
    } else {
      alert("Please select all fields.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📚 Select Course Details
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="" className="bg-gray-700 text-gray-300">-- Select Branch --</option>
                <option value="cse" className="bg-gray-700 text-white">CSE</option>
                <option value="ece" className="bg-gray-700 text-white">ECE</option>
                <option value="mech" className="bg-gray-700 text-white">MECH</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="" className="bg-gray-700 text-gray-300">-- Select Year --</option>
                <option value="1" className="bg-gray-700 text-white">1st Year</option>
                <option value="2" className="bg-gray-700 text-white">2nd Year</option>
                <option value="3" className="bg-gray-700 text-white">3rd Year</option>
                <option value="4" className="bg-gray-700 text-white">4th Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="" className="bg-gray-700 text-gray-300">-- Select Semester --</option>
                <option value="1" className="bg-gray-700 text-white">Semester 1</option>
                <option value="2" className="bg-gray-700 text-white">Semester 2</option>
                <option value="3" className="bg-gray-700 text-white">Semester 3</option>
                <option value="4" className="bg-gray-700 text-white">Semester 4</option>
                <option value="5" className="bg-gray-700 text-white">Semester 5</option>
                <option value="6" className="bg-gray-700 text-white">Semester 6</option>
                <option value="7" className="bg-gray-700 text-white">Semester 7</option>
                <option value="8" className="bg-gray-700 text-white">Semester 8</option>
              </select>
            </div>

            <button
              onClick={handleSearch}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>🔍</span>
              <span>Search Subjects</span>
            </button>
          </div>

          {showSubjects && (
            <div className="mt-8">
              <SubjectSelector branch={branch} year={year} semester={semester} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectPage;
