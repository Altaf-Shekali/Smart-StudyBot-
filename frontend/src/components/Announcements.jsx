import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../Context/AuthContext";

const AnnouncementSection = ({ branch, year, semester, subject }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        // Use the props passed from TeacherDashboard if available, otherwise use user data
        const params = {};
        if (branch && year && semester) {
          // Use props from TeacherDashboard
          params.branch = branch;
          params.year = year;
          params.semester = semester;
        } else if (isLoggedIn && user) {
          // Fallback to user data
          if (user.branch) params.branch = user.branch;
          if (user.year) params.year = user.year;
          if (user.semester) params.semester = user.semester;
        }

        const response = await axios.get("http://localhost:8000/announcements", {
          params
        });

        const mapped = response.data.map(ann => ({
          id: ann.id,
          title: ann.subject || "General Announcement",
          content: ann.content,
          date: formatDistanceToNow(new Date(ann.created_at), { addSuffix: true }),
          created_at: ann.created_at
        }));

        setAnnouncements(mapped);
      } catch (err) {
        if (err.response?.status === 404) {
          setAnnouncements([]);  // No announcements found
        } else {
          console.error("Error fetching announcements:", err);
          setError("Failed to fetch announcements");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [branch, year, semester, isLoggedIn, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!newAnnouncement.trim()) {
      setError("Announcement content cannot be empty");
      return;
    }

    try {
      const response = await axios.post("http://localhost:8000/announcements", {
        content: newAnnouncement,
        branch,
        year,
        semester,
        subject
      });

      // Add the new announcement to the list
      const newAnn = {
        id: response.data.id,
        title: response.data.subject || "General Announcement",
        content: response.data.content,
        date: "Just now",
        created_at: response.data.created_at
      };

      setAnnouncements([newAnn, ...announcements]);
      setNewAnnouncement("");
    } catch (err) {
      setError("Failed to post announcement. " + (err.response?.data?.detail || ""));
      console.error("Announcement post error:", err);
    }
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/announcements/${announcementId}`);
      setAnnouncements(announcements.filter(ann => ann.id !== announcementId));
    } catch (err) {
      setError("Failed to delete announcement. " + (err.response?.data?.detail || ""));
      console.error("Announcement delete error:", err);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-1">
          Announcements
        </h2>
        <p className="text-gray-400">
          Manage announcements for {branch?.toUpperCase()} - Year {year} - Semester {semester}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        {error && (
          <div className="bg-red-800 text-red-100 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            placeholder={`Post announcement for ${semester}...`}
            className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-3 px-8 rounded-lg transition-all"
          >
            Post
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-gray-700 rounded-xl p-6 text-center">
          <p className="text-gray-400">No announcements found for this semester</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-gray-700 p-4 rounded-lg border-l-4 border-green-500"
            >
              <div className="flex justify-between items-start">
                <p className="text-white flex-1 mr-4">{ann.content}</p>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all"
                  title="Delete announcement"
                >
                  🗑️
                </button>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-400">
                <span>{ann.subject || "General"}</span>
                <span>{new Date(ann.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementSection;