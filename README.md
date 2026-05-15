# Lockin

Lockin is an advanced AI-powered platform designed to optimize study sessions and presentation generation. By integrating an intuitive frontend with a robust backend, it helps users generate flashcards, summarize notes, explain code, and automatically create presentations.

## 🚀 Features

- **AI Note Summarizer**: Automatically distill long notes into concise, digestible summaries.
- **Smart Flashcards**: Generate interactive flashcards to accelerate learning and retention.
- **Code Explainer**: Break down and understand complex code snippets with AI.
- **PPT Generator**: Automatically create highly structured and beautifully formatted presentations.
- **Authentication**: Secure user authentication and session management using Supabase.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Animations**: Framer Motion

### Backend
- **Framework**: FastAPI (Python)
- **AI Integration**: OpenAI API
- **Database / Auth**: Supabase (PostgreSQL & GoTrue)

## 📂 Project Structure

```text
Lockin/
├── frontend/          # React + Vite frontend application
├── backend/           # FastAPI backend application
├── docs/              # Documentation, database scripts, and archive
├── .gitignore         # Root gitignore rules
└── README.md          # Project documentation
```

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Supabase account & project
- OpenAI API Key

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Lockin
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
```
Edit the `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```
Start the development server:
```bash
npm run dev
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
Edit the `.env` file with your credentials:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```
Start the backend server:
```bash
uvicorn app.main:app --reload
```

## 📦 Deployment

### Frontend (Vercel / Netlify)
1. Connect your GitHub repository to Vercel/Netlify.
2. Set the Root Directory to `frontend`.
3. Set the Framework Preset to `Vite`.
4. Add the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Deploy.

### Backend (Render / Railway)
1. Connect your repository to Render/Railway.
2. Set the Root Directory to `backend`.
3. Set the Environment to `Python 3`.
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add the Environment Variables (`SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY`, `SUPABASE_JWT_SECRET`).
7. Deploy.

### Database (Supabase)
1. Your Supabase project is already managed externally.
2. Run any required SQL migrations (found in `docs/database/`) in your Supabase SQL Editor.

## 📝 License

This project is licensed under the MIT License.
