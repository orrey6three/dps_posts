-- DPS45 Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for vote types
CREATE TYPE vote_type_enum AS ENUM ('relevant', 'irrelevant');

-- Create posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    vote_type vote_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_device_id ON votes(device_id);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE INDEX idx_votes_post_device ON votes(post_id, device_id, created_at);

-- Insert sample posts for Шумиха, Курганская область
-- These are example locations around the city
INSERT INTO posts (title, address, latitude, longitude) VALUES
('Пост ДПС - Въезд в город (трасса М51)', 'Трасса М51, въезд в Шумиху', 55.2280, 63.2950),
('Пост ДПС - Центр города', 'ул. Ленина, центр', 55.2317, 63.2892),
('Пост ДПС - Южный выезд', 'Южный выезд из города', 55.2200, 63.2800),
('Пост ДПС - Северный выезд', 'Северный выезд из города', 55.2400, 63.2900),
('Пост ДПС - Автовокзал', 'Район автовокзала', 55.2310, 63.2870),
('Пост ДПС - Рынок', 'Район городского рынка', 55.2330, 63.2910),
('Пост ДПС - Школа №1', 'ул. Школьная', 55.2340, 63.2880),
('Пост ДПС - Больница', 'ул. Больничная', 55.2300, 63.2920),
('Пост ДПС - Железнодорожный переезд', 'ж/д переезд', 55.2290, 63.2860),
('Пост ДПС - Восточный выезд', 'Восточный выезд', 55.2320, 63.3000),
('Пост ДПС - Западный выезд', 'Западный выезд', 55.2310, 63.2750),
('Пост ДПС - Заправка', 'Район АЗС', 55.2350, 63.2890),
('Пост ДПС - Мост', 'Мост через реку', 55.2270, 63.2910),
('Пост ДПС - Поворот на Курган', 'Поворот на трассу Курган', 55.2360, 63.2920),
('Пост ДПС - Поворот на Челябинск', 'Поворот на трассу Челябинск', 55.2250, 63.2850);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Posts are viewable by everyone" 
ON posts FOR SELECT 
USING (true);

CREATE POLICY "Votes are viewable by everyone" 
ON votes FOR SELECT 
USING (true);

-- Allow anyone to insert votes
CREATE POLICY "Anyone can vote" 
ON votes FOR INSERT 
WITH CHECK (true);

-- Create a function to get post statistics
CREATE OR REPLACE FUNCTION get_post_stats()
RETURNS TABLE (
    post_id UUID,
    title TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_relevant TIMESTAMP WITH TIME ZONE,
    last_irrelevant TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    relevant_count BIGINT,
    irrelevant_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.address,
        p.latitude,
        p.longitude,
        MAX(CASE WHEN v.vote_type = 'relevant' THEN v.created_at END) as last_relevant,
        MAX(CASE WHEN v.vote_type = 'irrelevant' THEN v.created_at END) as last_irrelevant,
        MAX(v.created_at) as last_activity,
        COUNT(CASE WHEN v.vote_type = 'relevant' THEN 1 END) as relevant_count,
        COUNT(CASE WHEN v.vote_type = 'irrelevant' THEN 1 END) as irrelevant_count
    FROM posts p
    LEFT JOIN votes v ON p.id = v.post_id
    GROUP BY p.id, p.title, p.address, p.latitude, p.longitude
    ORDER BY p.title;
END;
$$ LANGUAGE plpgsql;
