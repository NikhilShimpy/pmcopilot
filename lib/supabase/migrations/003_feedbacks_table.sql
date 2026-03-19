-- ============================================
-- FEEDBACKS TABLE MIGRATION
-- PMCopilot - Real-time Feedback Ingestion
-- ============================================

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual', 'gmail', 'slack', 'intercom', 'webhook', 'api')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON public.feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_source ON public.feedbacks(source);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_created ON public.feedbacks(project_id, created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view feedbacks for their own projects
CREATE POLICY "Users can view own project feedbacks"
  ON public.feedbacks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = feedbacks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert feedbacks for their own projects
CREATE POLICY "Users can insert own project feedbacks"
  ON public.feedbacks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = feedbacks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update feedbacks for their own projects
CREATE POLICY "Users can update own project feedbacks"
  ON public.feedbacks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = feedbacks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete feedbacks for their own projects
CREATE POLICY "Users can delete own project feedbacks"
  ON public.feedbacks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = feedbacks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Enable Realtime for feedbacks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;

-- Add comments for documentation
COMMENT ON TABLE public.feedbacks IS 'User feedback from various sources (manual, integrations, webhooks)';
COMMENT ON COLUMN public.feedbacks.source IS 'Source of feedback: manual, gmail, slack, intercom, webhook, api';
COMMENT ON COLUMN public.feedbacks.metadata IS 'Additional metadata (email subject, sender, slack user, etc.)';
