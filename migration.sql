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

-- Default sample markers removed to allow community-driven population

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

-- Enable Realtime for posts and votes
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

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
        MAX(vu.username) as last_voter_username
    FROM posts p
    LEFT JOIN votes v ON p.id = v.post_id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN (
        SELECT DISTINCT ON (post_id) post_id, device_id
        FROM votes
        ORDER BY post_id, created_at DESC
    ) last_v ON p.id = last_v.post_id
    LEFT JOIN users vu ON (vu.id::text = last_v.device_id OR vu.username = last_v.device_id)
    GROUP BY p.id, p.title, p.address, p.latitude, p.longitude, p.type, p.comment, p.tags, p.user_id, u.username, p.created_at
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;
