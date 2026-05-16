-- === DPS45 Unified Migration ===

-- 1. Схема таблиц и колонок
ALTER TABLE IF EXISTS posts ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS posts ADD COLUMN IF NOT EXISTS street_geometry JSONB;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_ip TEXT;

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
    ('marker_ttl', '{"ДПС": 3600, "Патруль": 300, "Чисто": 3600, "Нужна помощь": 3600, "Вопрос": 3600}'::jsonb),
    ('app_config', '{"is_registration_open": true, "show_offline_markers": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

-- 2. Основная функция статистики
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

-- 3. Функции администрирования
CREATE OR REPLACE FUNCTION public.admin_delete_votes_for_post(target_post_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  DELETE FROM public.votes WHERE post_id = target_post_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_all_votes()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  DELETE FROM public.votes;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_votes_for_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_all_votes() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_delete_votes_for_post(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_all_votes() TO service_role;

-- 4. Вставка статичных постов
INSERT INTO posts (title, address, latitude, longitude, type, is_static, comment)
SELECT * FROM (VALUES
    ('Пост ДПС - Виадук', 'Виадук', 55.216072, 63.267471, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Автозапад', 'Автозапад', 55.222229, 63.26959, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Отдел', 'Отдел', 55.225186, 63.2856, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Мир Света', 'Мир Света', 55.227346, 63.294359, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Угол Ленина/Гоголя', 'Угол Ленина/Гоголя', 55.228378, 63.298967, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Монетка Белоносова', 'Монетка Белоносова', 55.230139, 63.299014, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Квартал Новостроек', 'Квартал Новостроек', 55.237829, 63.314954, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Победы/Молодёжи', 'Победы/Молодёжи', 55.235038, 63.305525, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Советская/Гоголя', 'Советская/Гоголя', 55.234348, 63.286332, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Кольцо', 'Кольцо', 55.254677, 63.253482, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - Начало Каменской', 'Начало Каменской', 55.240094, 63.272624, 'ДПС', true, 'Статичный пост'),
    ('Пост ДПС - ХПП', 'ХПП', 55.22284, 63.27348, 'ДПС', true, 'Элеватор')
) AS t(title, address, latitude, longitude, type, is_static, comment)
WHERE NOT EXISTS (
    SELECT 1 FROM posts p WHERE p.title = t.title AND p.is_static = true
);

-- 5. Начальное состояние статичных постов (инициализация голосов)
INSERT INTO votes (post_id, device_id, vote_type)
SELECT id, 'system', 'irrelevant'
FROM posts
WHERE is_static = true
AND NOT EXISTS (
    SELECT 1 FROM votes WHERE post_id = posts.id AND device_id = 'system'
);

-- 6. Индексы под JOIN в get_post_stats (ускоряет агрегации по голосам)
CREATE INDEX IF NOT EXISTS idx_votes_post_id ON public.votes (post_id);
CREATE INDEX IF NOT EXISTS idx_votes_post_id_created_at_desc ON public.votes (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC);

-- 7. Подписка / платежи (Stripe), каталог городов
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

INSERT INTO settings (key, value)
VALUES (
  'city_catalog',
  $cities$[
    {"id":"shumikha","label":"Шумиха","lat":55.2255,"lng":63.2982},
    {"id":"shchuchye","label":"Щучье","lat":55.2133,"lng":62.7634},
    {"id":"mishkino","label":"Мишкино","lat":55.3385,"lng":63.9168},
    {"id":"kurgan","label":"Курган","lat":55.4444,"lng":65.3161},
    {"id":"ketovo","label":"Кетово","lat":55.354,"lng":65.334},
    {"id":"kurtamysh","label":"Куртамыш","lat":54.91,"lng":64.433},
    {"id":"shadrinsk","label":"Шадринск","lat":56.086,"lng":63.634},
    {"id":"vargashi","label":"Варгаши","lat":55.369,"lng":65.118},
    {"id":"yurgamysh","label":"Юргамыш","lat":55.379,"lng":64.46},
    {"id":"makushino","label":"Макушино","lat":55.21,"lng":67.251},
    {"id":"petukhovo","label":"Петухово","lat":55.065,"lng":67.898},
    {"id":"dalmatovo","label":"Далматово","lat":56.262,"lng":62.938},
    {"id":"tyumen","label":"Тюмень","lat":57.1522,"lng":65.5272},
    {"id":"yekaterinburg","label":"Екатеринбург","lat":56.8389,"lng":60.6057},
    {"id":"chelyabinsk","label":"Челябинск","lat":55.1644,"lng":61.4368}
  ]$cities$::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 8. Аватары пользователей (Storage)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
