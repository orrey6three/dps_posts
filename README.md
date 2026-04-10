# DPS45 (Next.js + React)

Народная карта постов ДПС, полностью переведённая на современный стек:
- `Next.js 16.2.3`
- `React 19.2.5`
- `App Router + Route Handlers`
- Supabase (данные, статистика, голоса)

## Что уже перенесено
- Публичная карта (`/`) на React.
- Авторизация, регистрация, выход.
- Добавление меток пользователями.
- Голосование за актуальность.
- Удаление собственной метки.
- Админ-панель (`/admin`):
  - проверка сессии администратора
  - статистика
  - CRUD меток
  - список пользователей и удаление
- Бот-эндпоинт для патрулей: `POST /api/patrol`.

## API
Публичные:
- `GET /api/health`
- `GET /api/posts`
- `POST /api/posts` (auth)
- `DELETE /api/posts/:id` (auth + owner/admin)
- `POST /api/vote` (auth)

Авторизация:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Админ:
- `GET /admin/api/verify`
- `GET /admin/api/stats`
- `GET /admin/api/posts`
- `POST /admin/api/posts`
- `PUT /admin/api/posts/:id`
- `DELETE /admin/api/posts/:id`
- `GET /admin/api/posts/:id/stats`
- `GET /admin/api/users`
- `DELETE /admin/api/users/:id`

Бот:
- `POST /api/patrol` (`x-bot-token` или `token` в body/query)

## Переменные окружения
Скопируйте `.env.example` в `.env` и заполните:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
JWT_SECRET=
BOT_TOKEN=
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=
```

## Локальный запуск
```bash
npm install
npm run dev
```

Приложение: `http://localhost:3000`

## Скрипты
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Структура
- `app/` — страницы и API route handlers.
- `src/components/` — React UI.
- `src/server/` — бизнес-логика и Supabase-интеграция.
- `src/lib/` — константы и утилиты.
- `public/` — статика (иконки, service worker).
