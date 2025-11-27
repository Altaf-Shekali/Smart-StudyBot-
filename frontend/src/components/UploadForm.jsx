import React, { useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { toast } from "react-toastify";

const UploadForm = () => {
  const [form, setForm] = useState({
    branch: "",
    year: "",
    semester: "",
    subject: "",
    file: null
  });
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append("file", form.file);
    formData.append("branch", form.branch);
    formData.append("year", form.year);
    formData.append("semester", form.semester);
    formData.append("subject", form.subject);
    
    try {
      const res = await axios.post("http://localhost:8000/upload", formData, {
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success(res.data.message);
      setForm({ branch: "", year: "", semester: "", subject: "", file: null });
    } catch (err) {
      toast.error("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Branch" 
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-12"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })} 
            required 
          />
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Year" 
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-12"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })} 
            required 
          />
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Semester" 
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-12"
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })} 
            required 
          />
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Subject" 
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-12"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })} 
            required 
          />
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>

      <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
        <label className="cursor-pointer">
          <input 
            type="file" 
            accept=".pdf" 
            className="hidden"
            onChange={(e) => setForm({ ...form, file: e.target.files[0] })} 
            required 
          />
          <div className="space-y-4">
            <svg 
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="text-gray-300">
              {form.file ? (
                <span className="text-blue-400">{form.file.name}</span>
              ) : (
                <>
                  <p className="font-medium">Drag and drop or click to upload</p>
                  <p className="text-sm text-gray-400">PDF files only</p>
                </>
              )}
            </div>
          </div>
        </label>
      </div>

      <button 
        type="submit"
        onClick={handleUpload}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading...</span>
          </div>
        ) : 'Upload PDF'}
      </button>
    </div>
  );
};

export default UploadForm;