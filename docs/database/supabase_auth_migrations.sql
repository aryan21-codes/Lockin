-- 1. Ensure Extension is enabled
create extension if not exists "uuid-ossp";

-- 2. Modify existing tables to link to auth.users and enforce Foreign Keys
ALTER TABLE IF EXISTS public.content_generations 
  ADD CONSTRAINT fk_content_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.flashcards 
  ADD CONSTRAINT fk_flashcards_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.todos 
  ADD CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.code_explanations 
  ADD CONSTRAINT fk_code_exp_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: We assume the user_id column in your tables is of type uuid!
-- If your tables were originally created with simple `text` user_id, you must drop/recreate them 
-- or cast them to uuid properly: `ALTER TABLE ... ALTER COLUMN user_id TYPE uuid USING user_id::uuid;`

-- 3. Enable Row-Level Security on all tables
ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_explanations ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies guaranteeing User Isolation
-- Content Generations
CREATE POLICY "Users can only view their own content" ON public.content_generations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own content" ON public.content_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Flashcards
CREATE POLICY "Users can only view their own flashcards" ON public.flashcards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own flashcards" ON public.flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- Todos
CREATE POLICY "Users can only view their own todos" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own todos" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own todos" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own todos" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- Code Explanations
CREATE POLICY "Users can only view their own code explanations" ON public.code_explanations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own code explanations" ON public.code_explanations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
