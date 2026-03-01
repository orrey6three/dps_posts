# Подробная инструкция по настройке Supabase для DPS45

## Шаг 1: Создание проекта

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите "Start your project"
3. Войдите через GitHub или создайте аккаунт
4. Нажмите "New project"
5. Заполните форму:
   - Name: `dps45`
   - Database Password: (создайте надежный пароль)
   - Region: выберите ближайший регион (например, `eu-central-1` для Европы)
   - Pricing Plan: `Free`
6. Нажмите "Create new project"
7. Дождитесь завершения создания проекта (~2 минуты)

## Шаг 2: Выполнение SQL миграции

1. В боковом меню выберите **SQL Editor**
2. Нажмите **"New query"**
3. Скопируйте весь контент из файла `migration.sql`
4. Вставьте в редактор SQL
5. Нажмите **"Run"** (или Ctrl+Enter)
6. Убедитесь, что запрос выполнился успешно (появится зеленая галочка)

### Что создаст миграция:

- ✅ Таблицу `posts` с 15 предустановленными постами
- ✅ Таблицу `votes` для хранения голосов
- ✅ Индексы для оптимизации производительности
- ✅ Row Level Security политики для публичного доступа
- ✅ Функцию `get_post_stats()` для получения статистики

## Шаг 3: Получение API credentials

1. В боковом меню выберите **Settings** (иконка шестеренки)
2. Выберите **API**
3. Найдите секцию **Project URL**:
   - Скопируйте URL (например: `https://abcdefgh.supabase.co`)
   - Это ваш `SUPABASE_URL`
4. Найдите секцию **Project API keys**:
   - Скопируйте **anon public** ключ
   - Это ваш `SUPABASE_ANON_KEY`
   - ⚠️ **НЕ** используйте service_role ключ!

## Шаг 4: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Supabase
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_ANON_KEY=ваш-anon-ключ

# Admin
ADMIN_PASSWORD=ваш_безопасный_пароль_для_админки
JWT_SECRET=случайная_длинная_строка_для_jwt

# Server
PORT=3000
NODE_ENV=development
```

### Генерация JWT_SECRET

Вы можете сгенерировать случайный JWT_SECRET командой:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Шаг 5: Проверка настройки

### Проверка таблиц

1. Откройте **Table Editor** в боковом меню
2. Убедитесь, что созданы таблицы:
   - `posts` - должно быть 15 записей
   - `votes` - пока пустая

### Проверка Row Level Security

1. Откройте **Authentication** → **Policies**
2. Убедитесь, что созданы политики:
   - Для `posts`: "Posts are viewable by everyone"
   - Для `votes`: "Votes are viewable by everyone" и "Anyone can vote"

### Проверка функции

1. Откройте **SQL Editor**
2. Выполните запрос:

```sql
SELECT * FROM get_post_stats();
```

3. Должны вернуться все 15 постов со статистикой

## Шаг 6: Первый запуск

1. Установите зависимости:
```bash
npm install
```

2. Запустите приложение:
```bash
npm run dev
```

3. Откройте браузер: http://localhost:3000

4. Вы должны увидеть карту с маркерами

## Проблемы и решения

### Ошибка: "Missing Supabase credentials"

**Решение:** Проверьте файл `.env` - убедитесь, что переменные `SUPABASE_URL` и `SUPABASE_ANON_KEY` заполнены корректно.

### Ошибка: "relation 'posts' does not exist"

**Решение:** SQL миграция не была выполнена. Повторите Шаг 2.

### Маркеры не отображаются на карте

**Решение:** 
1. Откройте Developer Tools (F12)
2. Проверьте Console на наличие ошибок
3. Проверьте вкладку Network - должен быть успешный запрос к `/api/posts`

### Ошибка 401 при голосовании

**Решение:** Проверьте Row Level Security политики в Supabase - убедитесь, что политика "Anyone can vote" включена.

## Следующие шаги

После успешной настройки:

1. ✅ Зайдите в админку `/admin`
2. ✅ Используйте пароль из `ADMIN_PASSWORD`
3. ✅ Добавьте или отредактируйте посты
4. ✅ Протестируйте голосование
5. ✅ Подготовьте к деплою на Vercel (см. README.md)

## Полезные ссылки

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SQL Reference](https://supabase.com/docs/guides/database)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

Если возникнут проблемы, создайте Issue на GitHub!
