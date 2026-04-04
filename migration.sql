-- Create is_static column if it does not exist
ALTER TABLE IF EXISTS posts ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS posts ADD COLUMN IF NOT EXISTS street_geometry JSONB;

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
    last_voter_username TEXT,
    last_vote_type TEXT,
    is_static BOOLEAN,
    street_geometry JSONB
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
        p.street_geometry
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
    GROUP BY p.id, p.title, p.address, p.latitude, p.longitude, p.type, p.comment, p.tags, p.user_id, u.username, p.created_at, p.is_static, p.street_geometry
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert static posts (if they do not already exist)
INSERT INTO posts (title, address, latitude, longitude, type, is_static, comment)
SELECT * FROM (VALUES
    ('Пост ДПС - Виадук', 'Виадук', 55.216072, 63.267471, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Автозапад', 'Автозапад', 55.222229, 63.26959, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Отдел', 'Отдел', 55.225186, 63.2856, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Мир Света', 'Мир Света', 55.227346, 63.294359, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Угол Ленина/Гоголя', 'Угол Ленина/Гоголя', 55.228378, 63.298967, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Монетка Белоносова', 'Монетка Белоносова', 55.230139, 63.299014, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Квартал Новостроек', 'Квартал Новостроек', 55.237829, 63.314954, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Победы/Молодёжи', 'Победы/Молодёжи', 55.235038, 63.305525, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Советская/Гоголя', 'Советская/Гоголя', 55.234348, 63.286332, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Кольцо', 'Кольцо', 55.254677, 63.253482, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - Начало Каменской', 'Начало Каменской', 55.240094, 63.272624, 'dps', true, 'Статичный пост'),
    ('Пост ДПС - ХПП', 'ХПП', 55.22284, 63.27348, 'dps', true, 'Элеватор')
) AS t(title, address, latitude, longitude, type, is_static, comment)
WHERE NOT EXISTS (
    SELECT 1 FROM posts p WHERE p.title = t.title AND p.is_static = true
);

-- Make static posts irrelevant by default so they appear inactive initially
INSERT INTO votes (post_id, device_id, vote_type)
SELECT id, 'system', 'irrelevant'
FROM posts
WHERE is_static = true
AND NOT EXISTS (
    SELECT 1 FROM votes WHERE post_id = posts.id AND device_id = 'system'
);
