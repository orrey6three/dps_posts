# 🚀 Быстрый старт DPS45

## За 3 минуты до работающего приложения

### 1. Установка (30 секунд)

```bash
npm install
```

### 2. Supabase (2 минуты)

1. Создайте проект на [supabase.com](https://supabase.com)
2. SQL Editor → скопируйте содержимое `migration.sql` → Run
3. Settings → API → скопируйте URL и anon key

### 3. Конфигурация (30 секунд)

```bash
cp .env.example .env
```

Заполните `.env`:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
ADMIN_PASSWORD=мой_пароль
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 4. Запуск (10 секунд)

```bash
npm run dev
```

Откройте: http://localhost:3000

**Яндекс.Карты работают без API ключа!** 🔥

## 🎯 Проверка работоспособности

- [ ] Карта загрузилась (Яндекс.Карты с темной темой)
- [ ] Видны 15 маркеров (красные/серые точки)
- [ ] Клик по маркеру открывает bottom sheet
- [ ] Карта плавно перемещается к посту
- [ ] Кнопки "Актуально"/"Неактуально" работают
- [ ] `/admin` открывается с паролем

## 🚀 Деплой на Vercel (5 минут)

```bash
# Через CLI
npm i -g vercel
vercel login
vercel

# Добавьте environment variables в Vercel Dashboard
# Готово!
```

## 📚 Документация

- `README.md` - основная документация
- `SUPABASE_SETUP.md` - подробная настройка БД
- `DEPLOY.md` - деплой на Vercel
- `FAQ.md` - частые вопросы
- `POSTS_EXAMPLES.md` - как добавлять посты

## 🆘 Проблемы?

### Ошибка: "Missing Supabase credentials"
→ Проверьте `.env` файл

### Карта не загружается
→ Проверьте интернет и консоль браузера (F12)

### "Неверный пароль" в админке
→ Проверьте `ADMIN_PASSWORD` в `.env`

## 🔥 Полезные команды

```bash
# Разработка
npm run dev

# Проверка постов
curl http://localhost:3000/api/posts

# Проверка health
curl http://localhost:3000/api/health

# Деплой
vercel --prod
```

## 📝 Структура

```
dps45/
├── lib/          # Backend логика
├── routes/       # API endpoints
├── public/       # Frontend
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── admin.html
├── server.js     # Express сервер
└── migration.sql # База данных
```

## ⚡ Следующие шаги

1. ✅ Измените координаты постов в админке
2. ✅ Настройте свой домен на Vercel
3. ✅ Поделитесь ссылкой с водителями Шумихи
4. ✅ Следите за обновлениями

---

**Всё работает?** Отлично! 🎉

**Есть вопросы?** Читайте FAQ.md или создайте Issue.
