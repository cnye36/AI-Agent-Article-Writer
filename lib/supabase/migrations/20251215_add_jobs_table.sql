-- Jobs table for background task processing
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'write_article', 'generate_outline', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  input JSONB NOT NULL, -- job parameters
  output JSONB, -- job results
  error JSONB, -- error details if failed
  progress JSONB, -- { current: number, total: number, message: string }
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient job queries
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Add RLS policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY jobs_select_own ON jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own jobs (for cancellation)
CREATE POLICY jobs_update_own ON jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for background workers)
CREATE POLICY jobs_service_all ON jobs
  FOR ALL
  USING (auth.role() = 'service_role');
