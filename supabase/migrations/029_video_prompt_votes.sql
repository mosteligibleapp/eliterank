-- Add votes_awarded to video_prompts for optional bonus vote incentive
ALTER TABLE video_prompts ADD COLUMN IF NOT EXISTS votes_awarded INT DEFAULT 0;
