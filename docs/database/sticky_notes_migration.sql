-- Sticky Notes Table
CREATE TABLE IF NOT EXISTS public.sticky_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'yellow',
    x REAL NOT NULL DEFAULT 50,
    y REAL NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only view their own sticky notes" ON public.sticky_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own sticky notes" ON public.sticky_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own sticky notes" ON public.sticky_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own sticky notes" ON public.sticky_notes
  FOR DELETE USING (auth.uid() = user_id);
