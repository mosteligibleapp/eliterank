-- Seed data for development and demo
-- This creates sample data matching the current mock data

-- Note: In production, you'd create a real user first via auth.users
-- For development, we'll create placeholder data

-- Insert a demo host profile (assumes user exists in auth.users)
-- You'll need to create a user first and replace this ID
-- INSERT INTO profiles (id, email, first_name, last_name, bio, city, instagram, twitter, linkedin, tiktok, hobbies, role)
-- VALUES (
--   'YOUR-USER-UUID-HERE',
--   'demo@eliterank.com',
--   'James',
--   'Davidson',
--   'Award-winning event host with 10+ years of experience in luxury lifestyle events.',
--   'New York',
--   '@jamesdavidson',
--   '@jdavidson',
--   'jamesdavidson',
--   '@jamesdavidsonhost',
--   ARRAY['Travel', 'Fine Dining', 'Golf', 'Art Collecting'],
--   'host'
-- );

-- Create a function to seed demo data (call this after creating a user)
CREATE OR REPLACE FUNCTION seed_demo_data(host_user_id UUID)
RETURNS void AS $$
DECLARE
  ny_comp_id UUID;
  la_comp_id UUID;
  miami_comp_id UUID;
  contestant_ids UUID[];
  c_id UUID;
BEGIN
  -- Create competitions
  INSERT INTO competitions (id, host_id, city, season, status, phase, total_contestants, total_votes, total_revenue, vote_price)
  VALUES
    (uuid_generate_v4(), host_user_id, 'New York', 2025, 'voting', 'voting', 24, 15420, 48500, 1.00),
    (uuid_generate_v4(), host_user_id, 'Los Angeles', 2025, 'nomination', 'nomination', 0, 0, 12000, 1.00),
    (uuid_generate_v4(), host_user_id, 'Miami', 2025, 'upcoming', 'setup', 0, 0, 0, 1.00)
  RETURNING id INTO ny_comp_id;

  -- Get the NY competition ID
  SELECT id INTO ny_comp_id FROM competitions WHERE city = 'New York' AND host_id = host_user_id LIMIT 1;

  -- Insert contestants for NY
  INSERT INTO contestants (competition_id, name, email, age, occupation, bio, instagram, interests, status, votes, rank, trend)
  VALUES
    (ny_comp_id, 'Sofia Rodriguez', 'sofia.r@email.com', 26, 'Physician', 'Emergency medicine resident. Passionate about healthcare access.', '@drsofia', ARRAY['Medicine', 'Yoga', 'Reading'], 'active', 2340, 1, 'up'),
    (ny_comp_id, 'David Kim', 'david.k@email.com', 29, 'Architect', 'Award-winning architect designing sustainable urban spaces.', '@davidkim', ARRAY['Architecture', 'Travel'], 'active', 2180, 2, 'up'),
    (ny_comp_id, 'Emma Thompson', 'emma.t@email.com', 27, 'Marketing Director', 'Leading brand strategies for Fortune 500 companies.', '@emmathompson', ARRAY['Marketing', 'Art'], 'active', 1950, 3, 'down'),
    (ny_comp_id, 'Michael Santos', 'michael.s@email.com', 31, 'Tech Founder', 'Building the future of AI-powered healthcare.', '@msantos', ARRAY['Technology', 'Healthcare'], 'active', 1820, 4, 'up'),
    (ny_comp_id, 'Isabella Martinez', 'isabella.m@email.com', 25, 'Fashion Designer', 'Sustainable fashion advocate and creative director.', '@isabellamartinez', ARRAY['Fashion', 'Sustainability'], 'active', 1680, 5, 'same'),
    (ny_comp_id, 'James Wilson', 'james.w@email.com', 30, 'Investment Banker', 'Finance professional with a passion for philanthropy.', '@jameswilson', ARRAY['Finance', 'Philanthropy'], 'active', 1520, 6, 'up'),
    (ny_comp_id, 'Olivia Chen', 'olivia.c@email.com', 28, 'Art Curator', 'Curating contemporary art exhibitions worldwide.', '@oliviachen', ARRAY['Art', 'Culture'], 'active', 1410, 7, 'down'),
    (ny_comp_id, 'Alexander Brooks', 'alex.b@email.com', 32, 'Attorney', 'Civil rights lawyer fighting for justice.', '@alexbrooks', ARRAY['Law', 'Justice'], 'active', 1280, 8, 'up');

  -- Insert nominees for NY
  INSERT INTO nominees (competition_id, name, email, age, occupation, bio, city, instagram, interests, nominated_by, status, profile_complete)
  VALUES
    (ny_comp_id, 'Alexandra Chen', 'alex.chen@email.com', 28, 'Creative Director', 'Award-winning creative director with a passion for sustainable fashion.', 'New York', '@alexchen', ARRAY['Art', 'Travel', 'Sustainability'], 'self', 'pending', true),
    (ny_comp_id, 'Marcus Williams', 'marcus.w@email.com', 31, 'Tech Entrepreneur', '', 'New York', '', ARRAY[]::TEXT[], 'third_party', 'pending-approval', false),
    (ny_comp_id, 'Tyler Bennett', 'tyler.b@email.com', 29, 'Investment Banker', '', 'New York', '', ARRAY[]::TEXT[], 'third_party', 'awaiting-profile', false),
    (ny_comp_id, 'Jasmine Okafor', 'jasmine.o@email.com', 27, 'Attorney', 'Corporate lawyer by day, salsa dancer by night. Passionate about justice and good food.', 'New York', '@jasmineokafor', ARRAY['Law', 'Dancing', 'Cooking', 'Travel'], 'third_party', 'profile-complete', true);

  -- Insert judges for NY
  INSERT INTO judges (competition_id, name, title, bio, sort_order)
  VALUES
    (ny_comp_id, 'Victoria Blackwell', 'Fashion Editor, Vogue', 'With over 15 years in fashion journalism, Victoria brings her keen eye for style and elegance to the panel.', 1),
    (ny_comp_id, 'Christopher Hayes', 'Lifestyle Influencer', '5M+ followers trust Christopher''s insights on modern dating, relationships, and personal branding.', 2),
    (ny_comp_id, 'Diana Chen', 'Founder, Elite Events', 'Diana has connected thousands of eligible singles through her exclusive matchmaking events across the globe.', 3);

  -- Insert sponsors for NY
  INSERT INTO sponsors (competition_id, name, tier, amount, sort_order)
  VALUES
    (ny_comp_id, 'Luxe Hotels', 'Platinum', 25000, 1),
    (ny_comp_id, 'Veuve Clicquot', 'Gold', 15000, 2),
    (ny_comp_id, 'Mercedes-Benz', 'Gold', 15000, 3),
    (ny_comp_id, 'Tiffany & Co.', 'Silver', 8000, 4);

  -- Insert events for NY
  INSERT INTO events (competition_id, name, date, end_date, status, public_visible, sort_order)
  VALUES
    (ny_comp_id, 'Nomination Period', '2025-01-15', '2025-02-01', 'completed', true, 1),
    (ny_comp_id, 'Contestants Announced', '2025-02-03', NULL, 'completed', true, 2),
    (ny_comp_id, 'Voting Round 1', '2025-02-05', '2025-02-12', 'active', true, 3),
    (ny_comp_id, 'Double Vote Day', '2025-02-10', NULL, 'upcoming', false, 4),
    (ny_comp_id, 'Voting Round 2', '2025-02-13', '2025-02-18', 'upcoming', true, 5),
    (ny_comp_id, 'Finals Gala', '2025-02-20', NULL, 'upcoming', true, 6);

  -- Insert announcements for NY
  INSERT INTO announcements (competition_id, type, title, content, pinned, published_at)
  VALUES
    (ny_comp_id, 'announcement', 'Double Vote Day Coming!', 'Mark your calendars! This Saturday all votes count double. Share with friends and help your favorite contestant win!', true, '2025-02-08 10:00:00'),
    (ny_comp_id, 'update', 'Voting Round 1 Now Open!', 'The wait is over! Voting for Round 1 is officially open. Cast your votes now to help your favorites advance to the next round.', false, '2025-02-05 09:00:00'),
    (ny_comp_id, 'announcement', 'Meet Our 24 Contestants', 'We''re thrilled to announce our official contestant lineup! Head to the Contestants page to meet all 24 amazing individuals competing for the title.', false, '2025-02-03 12:00:00'),
    (ny_comp_id, 'news', 'Judges Panel Revealed', 'Excited to announce our distinguished panel of judges who will help select our winner. Check out the About page to learn more about each judge.', false, '2025-01-28 14:00:00');

END;
$$ LANGUAGE plpgsql;

-- Usage: After creating a user via Supabase Auth, call:
-- SELECT seed_demo_data('your-user-uuid');
