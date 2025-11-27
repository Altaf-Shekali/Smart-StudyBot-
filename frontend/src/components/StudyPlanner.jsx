import React, { useState, useEffect, useRef } from "react";

const StudyPlanner = () => {
  const [tasks, setTasks] = useState([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Date");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(25 * 60);
  const [theme, setTheme] = useState("dark");
  const [analytics, setAnalytics] = useState({
    completed: 0,
    pending: 0,
    overdue: 0
  });
  const [editTaskId, setEditTaskId] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "" });
  
  const timerRef = useRef(null);
  const formRef = useRef(null);
  
  // Load from localStorage
  useEffect(() => {
    const storedTasks = JSON.parse(localStorage.getItem("studyTasks")) || [];
    const storedTheme = localStorage.getItem("studyTheme") || "dark";
    setTasks(storedTasks);
    setTheme(storedTheme);
  }, []);
  
  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("studyTasks", JSON.stringify(tasks));
    localStorage.setItem("studyTheme", theme);
    
    // Update analytics
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => !t.completed && new Date(t.date) < new Date()).length;
    const pending = tasks.filter(t => !t.completed && new Date(t.date) >= new Date()).length;
    
    setAnalytics({ completed, pending, overdue });
  }, [tasks, theme]);
  
  // Re-render every second for countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(t => [...t]);
      if (sessionActive) {
        setSessionTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setSessionActive(false);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Study Session Complete!", {
                body: "Take a short break!",
                icon: "/favicon.ico"
              });
            } else {
              showNotification("Study Session Complete! Take a short break!");
            }
            return 25 * 60; // Reset to 25 minutes
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionActive]);
  
  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);
  
  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: "" }), 3000);
  };
  
  const addOrUpdateTask = () => {
    // Validate inputs
    if (!subject.trim()) {
      showNotification("Please enter a subject for your task");
      return;
    }
    
    if (!date) {
      showNotification("Please select a due date and time");
      return;
    }
    
    // Create proper date format for storage
    const formattedDate = new Date(date).toISOString();
    
    if (editTaskId) {
      // Update existing task
      setTasks(tasks.map(task => 
        task.id === editTaskId 
          ? { ...task, subject, description, date: formattedDate, priority } 
          : task
      ));
      setEditTaskId(null);
      showNotification("Task updated successfully!");
    } else {
      // Add new task
      const newTask = {
        id: Date.now(),
        subject,
        description,
        date: formattedDate,
        priority,
        createdAt: new Date().toISOString(),
        completed: false,
      };
      setTasks([...tasks, newTask]);
      showNotification("Task added successfully!");
    }
    
    // Reset form
    setSubject("");
    setDescription("");
    setDate("");
    setPriority("Medium");
    
    // Reset form validation
    if (formRef.current) {
      formRef.current.reset();
    }
  };
  
  const toggleComplete = (id) => {
    setTasks(
      tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };
  
  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
    showNotification("Task deleted!");
  };
  
  const startEditTask = (task) => {
    setSubject(task.subject);
    setDescription(task.description);
    
    // Convert stored date to format compatible with datetime-local input
    const dateValue = new Date(task.date);
    const localDate = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    setDate(localDate);
    setPriority(task.priority);
    setEditTaskId(task.id);
    
    // Scroll to form
    document.getElementById("task-form")?.scrollIntoView({ behavior: "smooth" });
  };
  
  const getCountdown = (dueDate) => {
    const diff = new Date(dueDate) - new Date();
    if (diff <= 0) return "Time's up!";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${days > 0 ? `${days}d ` : ""}${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
  };
  
  const getProgress = (task) => {
    const start = new Date(task.createdAt).getTime();
    const end = new Date(task.date).getTime();
    const now = new Date().getTime();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, progress));
  };
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case "High": return "bg-red-600";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-green-600";
      default: return "bg-blue-600";
    }
  };
  
  const getUrgencyColor = (dueDate) => {
    const diffHours = (new Date(dueDate) - new Date()) / (1000 * 60 * 60);
    if (diffHours <= 2) return "bg-red-600";
    if (diffHours <= 24) return "bg-yellow-500";
    return "bg-green-600";
  };
  
  const toggleSession = () => {
    if (sessionActive) {
      setSessionActive(false);
    } else {
      setSessionActive(true);
    }
  };
  
  const resetSession = () => {
    setSessionActive(false);
    setSessionTime(25 * 60);
  };
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  // Filter and sort tasks
  const getFilteredSortedTasks = () => {
    let filteredTasks = [...tasks];
    
    // Apply filter
    if (filter === "Active") {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (filter === "Completed") {
      filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (filter === "Overdue") {
      filteredTasks = filteredTasks.filter(task => 
        !task.completed && new Date(task.date) < new Date()
      );
    }
    
    // Apply sort
    filteredTasks.sort((a, b) => {
      if (sort === "Priority") {
        const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sort === "Date") {
        return new Date(a.date) - new Date(b.date);
      } else if (sort === "Created") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });
    
    return filteredTasks;
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const filteredSortedTasks = getFilteredSortedTasks();
  
  return (
    <div className={`min-h-screen ${theme === "dark" 
      ? "bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white" 
      : "bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-900"} p-4 md:p-6 transition-colors duration-300`}>
      
      {/* Notification Banner */}
      {notification.show && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fadeIn">
          {notification.message}
        </div>
      )}
      
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold">📚 Study Planner Pro</h1>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Filter:</span>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 px-2 py-1 rounded"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Sort by:</span>
            <select 
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 px-2 py-1 rounded"
            >
              <option value="Date">Due Date</option>
              <option value="Priority">Priority</option>
              <option value="Created">Recently Added</option>
            </select>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Task Form & Analytics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add Task Form */}
          <div 
            id="task-form"
            ref={formRef}
            className={`p-6 rounded-xl shadow-lg transition-all duration-300 ${
              theme === "dark" ? "bg-gray-900" : "bg-white"
            }`}
          >
            <h2 className="text-xl font-bold mb-4">
              {editTaskId ? "✏️ Edit Task" : "➕ Add New Task"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="e.g., Math Homework"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  placeholder="Task details (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Due Date *</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={addOrUpdateTask}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 rounded-lg font-bold hover:opacity-90 transition-all"
              >
                {editTaskId ? "Update Task" : "Add Task"}
              </button>
              
              {editTaskId && (
                <button
                  onClick={() => {
                    setEditTaskId(null);
                    setSubject("");
                    setDescription("");
                    setDate("");
                    setPriority("Medium");
                  }}
                  className="w-full bg-gray-700 px-5 py-3 rounded-lg font-bold hover:bg-gray-600 transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
          
          {/* Analytics Card */}
          <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          }`}>
            <h2 className="text-xl font-bold mb-4">📊 Your Progress</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-900/30 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold">{analytics.completed}</div>
                <div className="text-sm">Completed</div>
              </div>
              
              <div className="bg-yellow-900/30 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold">{analytics.pending}</div>
                <div className="text-sm">Pending</div>
              </div>
              
              <div className="bg-red-900/30 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold">{analytics.overdue}</div>
                <div className="text-sm">Overdue</div>
              </div>
            </div>
            
            <div className="h-4 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-600 to-blue-600 transition-all duration-500"
                style={{ 
                  width: `${tasks.length ? (analytics.completed / tasks.length) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              Completion Rate: {tasks.length ? Math.round((analytics.completed / tasks.length) * 100) : 0}%
            </div>
          </div>
          
          {/* Study Session Timer */}
          <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          }`}>
            <h2 className="text-xl font-bold mb-4">⏱️ Study Session</h2>
            
            <div className="text-center">
              <div className="text-5xl font-mono font-bold my-6">
                {formatTime(sessionTime)}
              </div>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleSession}
                  className={`px-6 py-3 rounded-lg font-bold transition-all ${
                    sessionActive 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {sessionActive ? "Pause" : "Start"}
                </button>
                
                <button
                  onClick={resetSession}
                  className="px-6 py-3 bg-gray-700 rounded-lg font-bold hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                Pomodoro Technique: 25 mins focused study + 5 min break
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Task List */}
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 h-full ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          }`}>
            <h2 className="text-xl font-bold mb-4">📋 Your Tasks</h2>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {filteredSortedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-bold">No tasks found</h3>
                  <p className="text-gray-500">Add a task or change your filters</p>
                </div>
              ) : (
                filteredSortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-5 rounded-xl shadow transition-all duration-300 ${
                      theme === "dark" ? "bg-gray-800 hover:bg-gray-750" : "bg-gray-100 hover:bg-gray-200"
                    } ${task.completed ? "opacity-70" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <h3
                            className={`text-lg font-bold ${
                              task.completed ? "line-through" : ""
                            }`}
                          >
                            {task.subject}
                          </h3>
                        </div>
                        
                        {task.description && (
                          <p
                            className={`text-sm mb-3 ${
                              task.completed ? "line-through" : ""
                            } ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                          >
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Due: </span>
                            <span>{new Date(task.date).toLocaleString()}</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Created: </span>
                            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getUrgencyColor(
                              task.date
                            )}`}
                          >
                            ⏳ {getCountdown(task.date)}
                          </span>
                          
                          {!task.completed && new Date(task.date) < new Date() && (
                            <span className="px-2 py-1 rounded text-xs bg-red-900">
                              OVERDUE!
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleComplete(task.id)}
                          className={`p-2 rounded ${
                            task.completed
                              ? "bg-green-700 hover:bg-green-600"
                              : "bg-gray-700 hover:bg-gray-600"
                          }`}
                          title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                        >
                          {task.completed ? "✓" : "○"}
                        </button>
                        
                        <button
                          onClick={() => startEditTask(task)}
                          className="p-2 bg-blue-700 rounded hover:bg-blue-600"
                          title="Edit task"
                        >
                          ✏️
                        </button>
                        
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 bg-red-700 rounded hover:bg-red-600"
                          title="Delete task"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {!task.completed && (
                      <div className="mt-4 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 transition-all duration-500 ${
                            new Date(task.date) < new Date()
                              ? "bg-red-600"
                              : "bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                          }`}
                          style={{ width: `${getProgress(task)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Study Planner Pro • Never miss a deadline again!</p>
        <p className="mt-1">Tasks: {tasks.length} • Completed: {analytics.completed} • Productivity: {tasks.length ? Math.round((analytics.completed / tasks.length) * 100) : 0}%</p>
      </footer>
    </div>
  );
};

export default StudyPlanner;