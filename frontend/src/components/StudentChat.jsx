import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const StudentChat = () => {
    const [inputs, setInputs] = useState({
        branch: '', year: '', semester: '', question: ''
    });
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [selectedModel, setSelectedModel] = useState('ollama'); // 'ollama' or 'gemini'
    const [sessionId, setSessionId] = useState(() => {
        // Load session ID from localStorage on initial render
        if (typeof window !== 'undefined') {
            return localStorage.getItem('chatSessionId') || null;
        }
        return null;
    }); // Session ID for conversation continuity
    const chatContainerRef = useRef(null);
    const recognition = useRef(null);
    const synth = useRef(null);
    const currentUtterance = useRef(null);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Load chat history from localStorage on component mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedMessages = localStorage.getItem('chatMessages');
            if (savedMessages) {
                try {
                    const parsedMessages = JSON.parse(savedMessages);
                    if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                        setMessages(parsedMessages);
                    }
                } catch (error) {
                    console.error('Error parsing saved messages:', error);
                }
            }
        }
    }, []);

    // Voice recognition setup
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognition.current = new SpeechRecognition();
                recognition.current.continuous = false;
                recognition.current.interimResults = false;
                recognition.current.lang = 'en-US';
                recognition.current.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    setInputs(prev => ({
                        ...prev, 
                        question: `${prev.question} ${transcript}`.trim()
                    }));
                    setIsRecording(false);
                };
                recognition.current.onerror = () => setIsRecording(false);
            }
            synth.current = window.speechSynthesis;
        }
        return () => {
            if (recognition.current) recognition.current.stop();
            if (synth.current?.speaking) synth.current.cancel();
        };
    }, []);

    const validateInputs = () => {
        if (!inputs.branch || !inputs.year || !inputs.semester) {
            setMessages(prev => [
                ...prev,
                { 
                    role: 'assistant', 
                    content: "⚠️ Please fill all academic criteria (Branch, Year, Semester)",
                    sources: [],
                    isFromPdf: false,
                    modelType: selectedModel
                }
            ]);
            return false;
        }
        return true;
    };

    const handleAsk = async () => {
        if (!validateInputs() || !inputs.question.trim()) return;
        
        const userMessage = inputs.question;
        // Add user message to chat
        const updatedMessages = [...messages, {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString(),
            modelType: selectedModel
        }];
        setMessages(updatedMessages);
        // Save messages to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        }
        
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('question', userMessage);
            formData.append('branch', inputs.branch.toLowerCase());
            formData.append('year', inputs.year);
            formData.append('semester', inputs.semester);
            formData.append('model_type', selectedModel);
            if (file) formData.append('file', file);

            // Add session ID for conversation continuity
            if (!sessionId) {
                const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                setSessionId(newSessionId);
                formData.append('session_id', newSessionId);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('chatSessionId', newSessionId);
                }
            } else {
                formData.append('session_id', sessionId);
            }

            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');

            const { data } = await axios.post('http://localhost:8000/query/document', 
                formData,
                {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const assistantMessage = {
                role: 'assistant',
                content: data.answer || "No answer found",
                sources: data.sources || [],
                isFromPdf: data.is_from_pdf,
                pdfProcessed: data.pdf_processed,
                pdfFilename: data.pdf_filename,
                modelType: data.model_type || selectedModel, // Use backend response or fallback
                timestamp: new Date().toISOString()
            };
            
            // Get the current messages and add the assistant's response
            setMessages(prevMessages => {
                const updated = [...prevMessages, assistantMessage];
                // Save messages to localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('chatMessages', JSON.stringify(updated));
                }
                return updated;
            });
            setFile(null);
            setUploadStatus(null);
        } catch (err) {
            const errorMessage = err.response?.data?.answer || 
                                 err.response?.data?.detail || 
                                 err.message === 'Network Error' 
                                     ? "🔌 Connection error - check network"
                                     : 'Error fetching answer';
            
            setMessages(prev => [
                ...prev,
                { 
                    role: 'assistant', 
                    content: errorMessage,
                    sources: [],
                    isFromPdf: false,
                    modelType: selectedModel
                }
            ]);

            if (err.response?.status === 401) {
                window.location.href = '/login';
            }
        }
        setInputs(prev => ({...prev, question: ''}));
        setLoading(false);
    };

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) {
                setUploadStatus("File size too large (max 10MB)");
                return;
            }
            if (!selectedFile.type.includes('pdf')) {
                setUploadStatus("Only PDF files are supported");
                return;
            }
            
            setFile(selectedFile);
            setUploadStatus(`📄 ${selectedFile.name} ready to upload and analyze`);
        }
    };

    const speakAnswer = (text) => {
        if (!synth.current || !text) return;
        if (synth.current.speaking) synth.current.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.voice = synth.current.getVoices()
            .find(v => v.lang === 'en-US') || synth.current.getVoices()[0];
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        currentUtterance.current = utterance;
        synth.current.speak(utterance);
    };

    const stopSpeaking = () => {
        if (synth.current?.speaking) {
            synth.current.cancel();
            setIsSpeaking(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
        setFile(null);
        setUploadStatus(null);
        setSessionId(null);
        // Clear session from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('chatSessionId');
            localStorage.removeItem('chatMessages');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                        NoteNinja AI
                    </h1>
                    <p className="mt-2 text-red-300">Academic Knowledge Assistant</p>
                </div>

                {/* Model Selection */}
                <div className="flex flex-col items-center mb-4">
                    <div className="bg-gray-800 rounded-xl p-2 flex space-x-2">
                        <button
                            className={`px-4 py-2 rounded-lg transition-colors ${
                                selectedModel === 'ollama'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                                    : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                            onClick={() => setSelectedModel('ollama')}
                        >
                            <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                                Local (Ollama)
                            </span>
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg transition-colors ${
                                selectedModel === 'gemini'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                                    : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                            onClick={() => setSelectedModel('gemini')}
                        >
                            <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Cloud (Gemini)
                            </span>
                        </button>
                    </div>
                    
                    {selectedModel === 'gemini' && (
                        <div className="mt-2 text-sm text-green-400 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Using Google Gemini (faster response)
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input 
                            type="text"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Branch (e.g., cse)"
                            value={inputs.branch}
                            onChange={e => setInputs({...inputs, branch: e.target.value})}
                        />
                        <input 
                            type="text"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Year (e.g., 3)"
                            value={inputs.year}
                            onChange={e => setInputs({...inputs, year: e.target.value.replace(/\D/g, '')})}
                        />
                        <input 
                            type="text"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Semester (e.g., 6)"
                            value={inputs.semester}
                            onChange={e => setInputs({...inputs, semester: e.target.value.replace(/\D/g, '')})}
                        />
                    </div>
                    
                    {/* Chat History */}
                    <div 
                        ref={chatContainerRef}
                        className="mb-4 bg-gray-900 rounded-xl p-4 h-96 overflow-y-auto space-y-4"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center text-gray-400">
                                    <div className="mb-4">
                                        <div className="bg-gray-800 rounded-full p-3 inline-block">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p>Ask your academic questions</p>
                                    <p className="text-sm mt-1">Start by entering your course details</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div 
                                    key={index} 
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div 
                                        className={`max-w-[85%] rounded-2xl p-4 ${
                                            msg.role === 'user' 
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-br-none' 
                                                : 'bg-gray-700 text-gray-100 rounded-bl-none'
                                        }`}
                                    >
                                        <div className="flex items-center mb-1">
                                            {msg.role === 'assistant' && (
                                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-1 mr-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 8V4H8"></path>
                                                        <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                                                        <path d="M2 14h2"></path>
                                                        <path d="M20 14h2"></path>
                                                        <path d="M15 13v2"></path>
                                                        <path d="M9 13v2"></path>
                                                    </svg>
                                                </div>
                                            )}
                                            <span className="font-semibold text-xs">
                                                {msg.role === 'user' ? 'You' : 'NoteNinja AI'}
                                                {msg.role === 'assistant' && (
                                                    <span className="ml-2 text-xs text-gray-300">
                                                        ({msg.modelType === 'ollama' ? 'Local' : 'Gemini'})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        
                                        <div className="whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                        
                                        {msg.role === 'assistant' && (
                                            <div className="mt-3 pt-2">
                                                {/* Source information is now included in the LLM response */}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* File Upload */}
                    <div className="mb-4">
                        <div className="flex items-center space-x-2">
                            <label className="cursor-pointer bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg p-2 transition-colors flex items-center space-x-1">
                                <input 
                                    type="file"
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium">Upload PDF</span>
                            </label>
                            
                            {uploadStatus && (
                                <div className="text-sm text-gray-300 flex items-center">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-1 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                        {uploadStatus}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setFile(null);
                                            setUploadStatus(null);
                                        }}
                                        className="ml-2 text-gray-400 hover:text-gray-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            
                            <button
                                onClick={clearChat}
                                className="ml-auto text-gray-400 hover:text-gray-200 flex items-center text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Clear chat
                            </button>
                        </div>
                    </div>
                    
                    {/* Input Area */}
                    <div className="mb-6 relative">
                        <textarea 
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none pr-20"
                            placeholder={file ? `Ask questions about ${file.name}...` : "Ask your academic question or upload a PDF to analyze..."}
                            value={inputs.question}
                            onChange={e => setInputs({...inputs, question: e.target.value})}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <div className="absolute right-3 bottom-3 flex space-x-2">
                            <button
                                onClick={() => {
                                    if (isRecording) {
                                        recognition.current.stop();
                                        setIsRecording(false);
                                    } else {
                                        recognition.current.start();
                                        setIsRecording(true);
                                    }
                                }}
                                className={`p-2 rounded-full transition-all ${
                                    isRecording 
                                        ? 'animate-pulse bg-red-500/90 hover:bg-red-400/90'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                                disabled={!recognition.current || loading}
                                title={recognition.current ? "Voice input" : "Speech recognition not supported"}
                            >
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                            
                            <button 
                                onClick={handleAsk}
                                disabled={loading || !inputs.question.trim()}
                                className={`p-2 rounded-lg transition-all ${
                                    loading || !inputs.question.trim()
                                        ? 'bg-gray-600'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentChat;
