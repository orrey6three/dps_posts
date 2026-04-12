-- 1. Добавляем колонку бана
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT FALSE;

-- 2. Создаем таблицу жалоб
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

-- 3. Удаляем старую функцию, так как меняется её тип (добавляем колонку)
DROP FUNCTION IF EXISTS get_post_stats();

-- 4. Создаем новую версию функции
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
    last_voter_username TEXT,
    last_vote_type TEXT,
    is_static BOOLEAN,
    street_geometry JSONB,
    is_shadowbanned BOOLEAN
) AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
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
        MAX(last_v.username) as last_voter_username,
        MAX(last_v.vote_type::text) as last_vote_type,
        p.is_static,
        p.street_geometry,
        COALESCE(u.is_shadowbanned, false) as is_shadowbanned
    FROM posts p
    LEFT JOIN votes v ON p.id = v.post_id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN (
        SELECT DISTINCT ON (v.post_id) 
            v.post_id, 
            COALESCE(u.username, 'Admin') as username, 
            v.vote_type,
            v.created_at
        FROM votes v
        LEFT JOIN users u ON (u.id::text = v.device_id OR u.username = v.device_id)
        ORDER BY v.post_id, v.created_at DESC
    ) last_v ON p.id = last_v.post_id
    GROUP BY p.id, p.title, p.address, p.latitude, p.longitude, p.type, p.comment, p.tags, p.user_id, u.username, p.created_at, p.is_static, p.street_geometry, u.is_shadowbanned
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;
