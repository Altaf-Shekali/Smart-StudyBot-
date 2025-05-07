import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from './Navbar';

const StudentChat = () => {
    const [inputs, setInputs] = useState({
        branch: '', year: '', semester: '', question: ''
    });
    const [response, setResponse] = useState({ 
        answer: '', sources: [], isFromPdf: false 
    });
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognition = useRef(null);
    const synth = useRef(null);
    const currentUtterance = useRef(null);

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
            setResponse({
                answer: "⚠️ Please fill all academic criteria (Branch, Year, Semester)",
                sources: [],
                isFromPdf: false
            });
            return false;
        }
        return true;
    };

    const handleAsk = async () => {
        if (!validateInputs()) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');

            const { data } = await axios.post('http://localhost:8000/query/', 
                {
                    branch: inputs.branch.toLowerCase(),
                    year: inputs.year,
                    semester: inputs.semester,
                    question: inputs.question
                },
                {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setResponse({
                answer: data.answer || "No answer found",
                sources: data.sources || [],
                isFromPdf: data.is_from_pdf 
            });
        } catch (err) {
            const errorMessage = err.response?.data?.answer || 
                               err.response?.data?.detail || 
                               err.message === 'Network Error' 
                                    ? "🔌 Connection error - check network"
                                    : 'Error fetching answer';
            
            setResponse({
                answer: errorMessage,
                sources: [],
                isFromPdf: false
            });

            if (err.response?.status === 401) {
                window.location.href = '/login';
            }
        }
        setLoading(false);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                        NoteNinja AI
                    </h1>
                    <p className="mt-2 text-red-300">Academic Knowledge Assistant</p>
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
                    
                    <div className="mb-6 relative">
                        <textarea 
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none pr-16"
                            placeholder="Ask your academic question..."
                            value={inputs.question}
                            onChange={e => setInputs({...inputs, question: e.target.value})}
                        />
                        <button
                            onClick={() => setIsRecording(!isRecording)}
                            className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                                isRecording 
                                    ? 'animate-pulse bg-red-500/90 hover:bg-red-400/90'
                                    : 'bg-blue-500/80 hover:bg-blue-400/90'
                            }`}
                            disabled={!recognition.current}
                            title={recognition.current ? "Voice input" : "Speech recognition not supported"}
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    </div>

                    <button 
                        onClick={handleAsk}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Analyzing Documents...</span>
                            </div>
                        ) : 'Ask Question'}
                    </button>
                </div>

                {response.answer && (
        <div className={`bg-gray-800 rounded-2xl p-6 shadow-xl border ${
            response.isFromPdf ? 'border-green-500/30' : 'border-yellow-500/30'
        } relative group`}>
                        <div className="absolute top-4 right-4 flex space-x-2">
                            {isSpeaking ? (
                                <button
                                    onClick={stopSpeaking}
                                    className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors"
                                    title="Stop speech"
                                >
                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() => speakAnswer(response.answer)}
                                    className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors"
                                    title="Read answer aloud"
                                >
                                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.343 9.657L14 2l1.414 1.414-7.657 7.657 7.657 7.657-1.414 1.414-7.657-7.657z" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <pre className="whitespace-pre-wrap font-sans text-gray-100 text-lg leading-relaxed">
                {response.answer}
            </pre>
            
            {response.isFromPdf && response.sources.length > 0 ? (
      <div className="mt-6 pt-4 border-t border-gray-700 text-blue-400">
        <p className="text-sm mb-2 font-semibold">Reference Materials:</p>
        <ul className="space-y-1 text-sm">
          {response.sources.map((src, i) => {
            const [subject, fullFilename] = src.split('/');
            const filename = fullFilename?.split('-section')[0]; // Optional chaining to avoid errors
            return (
              <li key={i} className="truncate">
                📄{' '}
                <a
                  href={`http://localhost:8000/query/download?branch=${inputs.branch}&year=${inputs.year}&semester=${inputs.semester}&subject=${subject}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-blue-300"
                >
                  {filename || subject}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    ) : (
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center text-yellow-400 mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-semibold">General Knowledge Alert</span>
        </div>
        <p className="text-yellow-200 text-sm">
          This answer was generated from general knowledge and not specific course materials.
        </p>
      </div>
    )}
        </div>
    )}
</div>
        </div>
    );
};

export default StudentChat;