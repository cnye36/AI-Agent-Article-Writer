-- Add user preferences table for onboarding and personalization

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Onboarding data
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_answers JSONB DEFAULT '{}',
  onboarded_at TIMESTAMP WITH TIME ZONE,

  -- Personalization settings
  primary_industry TEXT NOT NULL DEFAULT 'technology',
  selected_subcategories TEXT[] DEFAULT '{}',
  custom_keywords TEXT[] DEFAULT '{}',

  -- UI customization
  placeholder_preferences JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_primary_industry ON user_preferences(primary_industry);

-- Row Level Security (RLS)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preferences
CREATE POLICY user_preferences_select_policy ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY user_preferences_insert_policy ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY user_preferences_update_policy ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY user_preferences_delete_policy ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comment
COMMENT ON TABLE user_preferences IS 'Stores user onboarding answers and personalization preferences';
