-- Full Database Initialization for ProducHub

-- 1. Enable extension for UUID generation
create extension if not exists "uuid-ossp";

-- 2. CREATE ALL TABLES
-- Note: 'user_id' strictly references the native internal Supabase Auth schema ('auth.users').

CREATE TABLE IF NOT EXISTS public.content_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_type TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    priority TEXT,
    due_date TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.code_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    explanation JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. ENABLE ROW-LEVEL SECURITY (RLS)
-- This blocks any client from querying databases they don't explicitly own.

ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_explanations ENABLE ROW LEVEL SECURITY;


-- 4. APPLY ISOLATION POLICIES (Users only see/edit their own token's rows)

-- Content Generations Policies
CREATE POLICY "Users can only view their own content" ON public.content_generations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own content" ON public.content_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Flashcards Policies
CREATE POLICY "Users can only view their own flashcards" ON public.flashcards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own flashcards" ON public.flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- Todos Policies
CREATE POLICY "Users can only view their own todos" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own todos" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own todos" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own todos" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- Code Explanations Policies
CREATE POLICY "Users can only view their own code explanations" ON public.code_explanations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own code explanations" ON public.code_explanations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
