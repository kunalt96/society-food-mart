-- Adds verification flag for seller onboarding flow
ALTER TABLE cloud_kitchens
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional but recommended for Explore listing queries
CREATE INDEX IF NOT EXISTS idx_cloud_kitchens_is_verified
ON cloud_kitchens (is_verified);
