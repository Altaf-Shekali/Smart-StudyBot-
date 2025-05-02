# 🧠 NoteNinja (Smart StudyBot+)

NoteNinja is an AI-powered academic assistant designed to help students and educators interact with study materials in a smart and efficient way. Built using **React + Vite** for the frontend and **FastAPI + Python** for the backend, it uses **Retrieval-Augmented Generation (RAG)** powered by **FAISS** and **Ollama** to provide accurate, source-cited answers from uploaded PDFs.

---

## 🚀 Features

- 📚 Ask questions from syllabus PDFs categorized by branch, year, semester, and subject
- 🧠 AI-powered answers using local LLMs (via Ollama)
- 📌 Source-cited responses showing the exact paragraph/page
- 📂 Organized multi-PDF knowledge base with vector storage
- 💬 Real-time Q&A with chat history
- 👥 Role-based access for Teachers and Students
- 🧑‍🏫 Teacher Dashboard with analytics and query tracking
- 📥 Drag-and-drop PDF upload and embedding
- 📄 Option for students to download entire PDFs on request

---

## 🛠️ Tech Stack

### Frontend
- React.js (with Vite)
- Tailwind CSS
- Axios
- React Router

### Backend
- Python
- FastAPI
- FAISS (for vector indexing)
- Ollama (local LLM serving)
- SQLite (for local database)
- Pydantic
- JWT Authentication

---

## 📁 Project Structure

NoteNinja/
├── backend/
│ ├── main.py
│ ├── db.py
│ ├── llm_interface.py
│ ├── retriever.py
│ ├── utils.py
│ ├── models.py
│ ├── schemas.py
│ ├── create_tables.py
│ ├── requirements.txt
│ ├── studybot.db
│ ├── routers/
│ │ ├── auth.py
│ │ ├── query.py
│ │ ├── upload.py
│ │ └── init.py
│ ├── vector_store/
│ │ └── [branch/year/sem]/[subject]/index.faiss
│ └── data/
│ └── *.pdf
│
└── frontend/
├── index.html
├── vite.config.js
├── src/
│ ├── App.jsx
│ ├── main.jsx
│ ├── components/
│ ├── pages/
│ ├── services/
│ └── assets/
└── package.json


---

## 🧪 Getting Started

### ⚙️ Backend Setup 
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload

### Frontend setup
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev

🔐 Authentication & Roles
Students: Can upload PDFs, ask questions, view chat history, and download documents.

Teachers: Can view student questions, access analytics dashboard, and manage knowledge base.

🧑‍🏫 Teacher Analytics Dashboard
View number of questions asked per subject/semester

Track student usage

Monitor which topics are queried the most

Plan syllabus accordingly based on analytics

📌 Use Cases
Engineering students asking course-related questions by semester

Teachers uploading and organizing reference material

Offline-friendly academic chatbot (local AI models)

📬 Contact
Created by: Altaf Shekali
📧 Email: altafshekali16@gmail.com
🔗 GitHub: @Altaf-Shekali

⭐ Support
If you find this project useful, please give it a ⭐ on GitHub to support continued development and updates!


