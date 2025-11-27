import React, { useState, useEffect } from "react";
import axios from "axios";

const SubjectSelector = ({ branch, year, semester }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleDownload = async () => {
    if (!selectedSubject) return;
    setError(null);
    setDownloading(true);
    try {
      const res = await axios.get("http://localhost:8000/query/download", {
        params: { branch, year, semester, subject: selectedSubject },
        responseType: "blob",
      });

      const contentDisposition = res.headers["content-disposition"] || "";
      const filenameMatch = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);
      const filename = filenameMatch ? filenameMatch[1] : `${selectedSubject}.pdf`;

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      setError(e?.response?.data?.detail || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-6 text-white">
      <label className="block text-sm font-medium text-gray-300 mb-3">
        Subjects
      </label>

      {loading ? (
        <div className="text-blue-400 font-semibold">Loading subjects...</div>
      ) : subjects.length > 0 ? (
        <>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="" className="bg-gray-700 text-gray-300">-- Select Subject --</option>
            {subjects.map((subject, idx) => (
              <option key={idx} value={subject} className="bg-gray-700 text-white">
                {subject}
              </option>
            ))}
          </select>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={!selectedSubject || downloading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${!selectedSubject || downloading
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-105"
                }`}
            >
              {downloading ? "Downloading..." : "Download PDF"}
            </button>
            {error && <span className="text-red-400 text-sm font-medium">{error}</span>}
          </div>
        </>
      ) : (
        <div className="text-red-400 font-medium">No subjects found.</div>
      )}
    </div>
  );
};

export default SubjectSelector;
