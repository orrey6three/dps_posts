# DPS45 - Народная карта постов ДПС

Production-ready веб-приложение для отслеживания постов ДПС в городе Шумиха, Курганская область.

## 🚀 Особенности

- **Mobile-first дизайн** - оптимизирован для мобильных устройств
- **Яндекс.Карты** - лучшие карты России с плавной анимацией
- **Система голосования** - пользователи могут отмечать посты как актуальные/неактуальные
- **Антиспам защита** - ограничение голосования (1 голос в 10 минут на устройство)
- **Админка** - управление постами с защищенным доступом
- **Real-time обновления** - статистика обновляется после каждого голосования
- **Темная тема** - минималистичный дизайн

## 📋 Требования

- Node.js 18+
- Аккаунт Supabase (бесплатный)
- Аккаунт Vercel (бесплатный, опционально)

**API ключ Яндекс.Карт не обязателен!** Работает без ключа с небольшими ограничениями (достаточно для одного города).

## 🔧 Установка

### 1. Клонируйте репозиторий

```bash
git clone <your-repo>
cd dps45
npm install
```

### 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в SQL Editor
3. Выполните скрипт из файла `migration.sql`
4. Получите credentials:
   - Project URL: Settings → API → Project URL
   - Anon Key: Settings → API → Project API keys → anon public

### 3. Настройка переменных окружения

Создайте файл `.env`:

```bash
cp .env.example .env
```

Заполните переменные:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key-here

# Server
PORT=3000
NODE_ENV=development
```

**Важно:** Используйте надежные пароли для production!

### 4. Запуск в разработке

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

## 🌐 Деплой на Vercel

### Автоматический деплой

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Деплой:
```bash
vercel
```

3. Добавьте переменные окружения в Vercel Dashboard:
   - Settings → Environment Variables
   - Добавьте все переменные из `.env`

### Через GitHub

1. Загрузите код на GitHub
2. Импортируйте проект в Vercel
3. Добавьте переменные окружения
4. Deploy!

## 📱 Использование

### Для пользователей

1. Откройте карту на мобильном устройстве
2. Нажмите на маркер поста
3. Отметьте как "Актуально" или "Неактуально"
4. Информация обновится для всех пользователей

### Для администраторов

1. Перейдите на `/admin`
2. Введите пароль
3. Управляйте постами:
   - Добавить новый пост
   - Редактировать координаты
   - Удалить пост
   - Просмотр статистики

## 🗂 Структура проекта

```
dps45/
├── lib/
│   ├── supabase.js      # Работа с базой данных
│   └── auth.js          # Аутентификация админа
├── routes/
│   ├── api.js           # API для голосования
│   └── admin.js         # API для админки
├── public/
│   ├── css/
│   │   └── style.css    # Стили
│   ├── js/
│   │   ├── app.js       # Основное приложение
│   │   └── admin.js     # Админка
│   ├── index.html       # Главная страница
│   └── admin.html       # Страница админки
├── server.js            # Express сервер
├── migration.sql        # SQL схема
├── package.json
├── vercel.json          # Конфигурация Vercel
└── README.md
```

## 🔒 Безопасность

### Защита от спама

- Device ID генерируется и хранится в localStorage
- Проверка на дублирование голосов в базе данных
- Ограничение: 1 голос в 10 минут на один пост

### Админка

- JWT токены в httpOnly cookies
- Простой пароль-аутентификация
- Защита всех админ-роутов

### Production настройки

- HTTPS обязателен в production
- Secure cookies в production
- CORS настроен правильно
- SQL injection защита через параметризованные запросы

## 🔄 API Endpoints

### Публичные

```
GET  /api/posts          # Получить все посты со статистикой
POST /api/vote           # Отправить голос
GET  /api/health         # Health check
```

### Админские (требуют авторизации)

```
POST   /admin/login           # Войти
POST   /admin/logout          # Выйти
GET    /admin/verify          # Проверить сессию
GET    /admin/posts           # Получить посты с детальной статистикой
POST   /admin/posts           # Создать пост
PUT    /admin/posts/:id       # Обновить пост
DELETE /admin/posts/:id       # Удалить пост
GET    /admin/posts/:id/stats # Детальная статистика поста
```

## 📊 База данных

### Таблица `posts`

```sql
id          UUID PRIMARY KEY
title       TEXT NOT NULL
address     TEXT
latitude    DOUBLE PRECISION NOT NULL
longitude   DOUBLE PRECISION NOT NULL
created_at  TIMESTAMP WITH TIME ZONE
```

### Таблица `votes`

```sql
id          UUID PRIMARY KEY
post_id     UUID FOREIGN KEY → posts(id)
device_id   TEXT NOT NULL
vote_type   ENUM('relevant', 'irrelevant')
created_at  TIMESTAMP WITH TIME ZONE
```

### Индексы

- `idx_votes_post_id` на votes(post_id)
- `idx_votes_device_id` на votes(device_id)
- `idx_votes_created_at` на votes(created_at)
- `idx_votes_post_device` на votes(post_id, device_id, created_at)

## 🎨 Дизайн

### Цветовая схема

- **Красный маркер** - пост актуален (последний голос "Актуально")
- **Серый маркер** - пост неактуален (последний голос "Неактуально")
- **Бледно-серый** - нет активности более 6 часов

### Адаптивность

- Оптимизирован для мобильных устройств (320px+)
- Touch-friendly кнопки (минимум 44x44px)
- Bottom sheet интерфейс
- Smooth scrolling

## 🛠 Разработка

### Запуск в dev режиме

```bash
npm run dev
```

### Тестирование API

```bash
# Health check
curl http://localhost:3000/api/health

# Получить посты
curl http://localhost:3000/api/posts

# Отправить голос
curl -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"post_id":"uuid","device_id":"uuid","vote_type":"relevant"}'
```

## 📝 Лицензия

MIT

## 🤝 Контрибьюция

Pull requests приветствуются!

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📧 Поддержка

Если у вас возникли проблемы, создайте Issue на GitHub.

## 🎯 Roadmap

- [ ] Push уведомления о новых постах
- [ ] История голосований
- [ ] Фильтрация по времени
- [ ] Экспорт статистики
- [ ] Telegram бот интеграция
- [ ] Мультиязычность
- [ ] PWA поддержка

---

Сделано с ❤️ для Шумихи
# dps_posts
