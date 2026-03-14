-- DPS45 Database Schema V3
-- Run this script in your Supabase SQL Editor

-- Cleanup existing objects if they exist
DROP FUNCTION IF EXISTS get_post_stats();
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS vote_type_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for vote types
CREATE TYPE vote_type_enum AS ENUM ('relevant', 'irrelevant');

-- Create enum for user roles
CREATE TYPE user_role_enum AS ENUM ('user', 'admin');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role_enum DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    type TEXT DEFAULT 'ДПС', -- 'ДПС', 'Нужна помощь', 'Чисто', 'Вопрос'
    comment TEXT,
    tags TEXT[] DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    vote_type vote_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_post_id ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_device_id ON votes(device_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_post_device ON votes(post_id, device_id, created_at);

-- Insert a default Admin User
-- Note: password_hash is for 'admin' (using bcrypt hash of 'admin')
INSERT INTO users (id, username, password_hash, role) 
VALUES (
    uuid_generate_v5(uuid_ns_url(), 'admin@dps45.local'),
    'admin', 
    '$2a$10$tZ92Sg3V2Y/Q0cO8c3NXYeRQ7bK9E8f8r1K0z/j3hK7y5R9K.xG8G', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert sample posts for Шумиха, Курганская область, owned by the Admin user
INSERT INTO posts (id, title, address, latitude, longitude, type, created_at, user_id) 
SELECT id, title, address, latitude, longitude, 'ДПС', created_at, uuid_generate_v5(uuid_ns_url(), 'admin@dps45.local') 
FROM (VALUES 
    ('10e19406-60fb-4810-b3ae-c1fffe09b099'::uuid, 'Пост ДПС - Квартал Новостроек', 'район Новостроек', 55.237829, 63.314954, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('1402da71-b96b-46e9-8cec-7d6e9026d569'::uuid, 'Пост ДПС - Мир Света', 'Шумиха, район Мир Света', 55.227346, 63.294359, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('14542369-07fa-4ae3-b770-c841aa107330'::uuid, 'Пост ДПС - Советская/Гоголя', 'перекресток Советская и Гоголя', 55.234348, 63.286332, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('236973b0-dcde-4f08-9d41-9a40d735bd3f'::uuid, 'Гостиница', NULL, 55.227313, 63.282989, '2026-03-12 19:30:14.084211+00'::timestamptz),
    ('2755d2e3-5b77-4afd-8128-c9c0aacd29c5'::uuid, 'Пожарка на Гагарина', NULL, 55.225651, 63.284144, '2026-03-12 19:25:38.432371+00'::timestamptz),
    ('3e11a4cc-91f4-4c7f-a738-5368d00aa4d6'::uuid, 'Пост ДПС - Победы/Молодёжи', 'перекресток Победы и Молодёжи', 55.235038, 63.305525, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('42a27d7f-6fd6-4ca6-92d8-0eda5c494147'::uuid, 'Пост ДПС - Отдел', 'Шумиха, район Отдела', 55.225186, 63.2856, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('6d507990-99f1-491d-bd29-cc51f5f6f55e'::uuid, 'Пост ДПС - Начало Каменской', 'улица Каменская', 55.240094, 63.272624, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('8c6d036d-17b3-41a7-b029-4f7e5b1171c0'::uuid, 'Малое Дюрягино', NULL, 55.201401, 63.246736, '2026-03-12 19:17:58.772522+00'::timestamptz),
    ('a4b1de9b-8cb4-49af-8c58-6f7f1611b9db'::uuid, 'Пост ДПС - Виадук', 'Шумиха, район Виадука', 55.216072, 63.267471, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('b3b50614-8d97-4c08-9f93-a963ded9f8e7'::uuid, 'Пост ДПС - Монетка Белоносова', 'у магазина Монетка (Белоносова)', 55.230139, 63.299014, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('c82558b7-06eb-4f4c-805f-cc58fc9b47b4'::uuid, 'Пост ДПС - Угол Ленина/Гоголя', 'Перекресток Ленина и Гоголя', 55.228378, 63.298967, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('df75f85f-9867-4a10-b999-de9642dfbdd4'::uuid, 'Подъём Виадук ( перекрестие улиц )', NULL, 55.221616, 63.264218, '2026-03-12 19:46:08.404074+00'::timestamptz),
    ('dfe3a558-d418-4c20-a84e-eb49610d9b1b'::uuid, 'Пост ДПС - Кольцо', 'Шумихинское кольцо', 55.254677, 63.253482, '2026-03-01 13:32:44.900874+00'::timestamptz),
    ('fa54438a-3ee2-4653-ae42-fec4b4c9bfa3'::uuid, 'Спартака - Олохова ( напротив Продсервиса )', NULL, 55.233509, 63.273488, '2026-03-12 19:43:51.25716+00'::timestamptz)
) AS default_posts(id, title, address, latitude, longitude, created_at)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow reading users
CREATE POLICY "Users are viewable by everyone" 
ON users FOR SELECT USING (true);

-- Allow reading posts
CREATE POLICY "Posts are viewable by everyone" 
ON posts FOR SELECT USING (true);

-- Allow reading votes
CREATE POLICY "Votes are viewable by everyone" 
ON votes FOR SELECT USING (true);

-- Allow anyone to insert votes
CREATE POLICY "Anyone can vote" 
ON votes FOR INSERT WITH CHECK (true);

-- Create a function to get post statistics
DROP FUNCTION IF EXISTS get_post_stats();

CREATE OR REPLACE FUNCTION get_post_stats()
RETURNS TABLE (
    post_id UUID,
    title TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    type TEXT,
    comment TEXT,
    tags TEXT[],
    user_id UUID,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    last_relevant TIMESTAMP WITH TIME ZONE,
    last_irrelevant TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    relevant_count BIGINT,
    irrelevant_count BIGINT,
    last_voter_username TEXT
) AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH last_votes AS (
        SELECT DISTINCT ON (votes.post_id) votes.post_id, votes.device_id, votes.created_at
        FROM votes
        ORDER BY votes.post_id, votes.created_at DESC
    )
    SELECT 
        p.id as post_id,
        p.title,
        p.address,
        p.latitude,
        p.longitude,
        p.type,
        p.comment,
        p.tags,
        p.user_id,
        u.username,
        p.created_at,
        MAX(CASE WHEN v.vote_type = 'relevant' THEN v.created_at END) as last_relevant,
        MAX(CASE WHEN v.vote_type = 'irrelevant' THEN v.created_at END) as last_irrelevant,
        MAX(v.created_at) as last_activity,
        COUNT(CASE WHEN v.vote_type = 'relevant' THEN 1 END) as relevant_count,
        COUNT(CASE WHEN v.vote_type = 'irrelevant' THEN 1 END) as irrelevant_count,
        (
            SELECT vu.username 
            FROM users vu 
            WHERE vu.id::text = lv.device_id 
               OR vu.username = lv.device_id -- fallback if device_id was stored as username
            LIMIT 1
        ) as last_voter_username
    FROM posts p
    LEFT JOIN votes v ON p.id = v.post_id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN last_votes lv ON p.id = lv.post_id
    GROUP BY p.id, p.title, p.address, p.latitude, p.longitude, p.type, p.comment, p.tags, p.user_id, u.username, p.created_at, lv.device_id
    ORDER BY p.title;
END;
$$ LANGUAGE plpgsql;
