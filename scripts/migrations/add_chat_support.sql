-- ============================================
-- PMCopilot - Chat Support Migration
-- Add tables for interactive chat with analysis results
-- ============================================

-- Create analysis_chat_messages table
CREATE TABLE IF NOT EXISTS analysis_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context JSONB, -- Stores {section_type, section_id, section_content} for drag-drop context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying by analysis_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_analysis
  ON analysis_chat_messages(analysis_id, created_at DESC);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_created
  ON analysis_chat_messages(created_at DESC);

-- Create GIN index for JSONB context searching
CREATE INDEX IF NOT EXISTS idx_chat_messages_context
  ON analysis_chat_messages USING GIN(context);

-- Create chat_sessions table (optional - for tracking conversation sessions)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for chat sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_analysis
  ON chat_sessions(analysis_id, user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE analysis_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see chat messages for analyses they own
CREATE POLICY chat_messages_select_policy ON analysis_chat_messages
  FOR SELECT
  USING (
    analysis_id IN (
      SELECT a.id FROM analyses a
      INNER JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: Users can insert chat messages for their analyses
CREATE POLICY chat_messages_insert_policy ON analysis_chat_messages
  FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT a.id FROM analyses a
      INNER JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: Users can only see their own chat sessions
CREATE POLICY chat_sessions_select_policy ON chat_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own chat sessions
CREATE POLICY chat_sessions_insert_policy ON chat_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to update message count in chat_sessions
CREATE OR REPLACE FUNCTION update_chat_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET
    message_count = (
      SELECT COUNT(*)
      FROM analysis_chat_messages
      WHERE analysis_id = NEW.analysis_id
    ),
    updated_at = NOW()
  WHERE analysis_id = NEW.analysis_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update message count
CREATE TRIGGER trigger_update_chat_session_message_count
  AFTER INSERT ON analysis_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_message_count();

-- Add comments for documentation
COMMENT ON TABLE analysis_chat_messages IS 'Stores chat messages between users and AI for refining analysis results';
COMMENT ON TABLE chat_sessions IS 'Tracks chat sessions for each analysis';
COMMENT ON COLUMN analysis_chat_messages.context IS 'Stores drag-drop context: {section_type: "problem"|"feature"|"prd", section_id: "PROB-001", section_content: "..."}';
COMMENT ON COLUMN analysis_chat_messages.role IS 'Message role: user (human), assistant (AI), system (notifications)';

-- Grant permissions
GRANT SELECT, INSERT ON analysis_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_sessions TO authenticated;
