# Деплой DPS45 на Vercel

Подробная инструкция по развертыванию приложения на Vercel.

## Предварительные требования

- ✅ Настроен и работает Supabase (см. SUPABASE_SETUP.md)
- ✅ Аккаунт GitHub (для автоматического деплоя)
- ✅ Аккаунт Vercel (бесплатный)

## Вариант 1: Автоматический деплой через GitHub (рекомендуется)

### Шаг 1: Подготовка кода

1. Создайте репозиторий на GitHub:
```bash
git init
git add .
git commit -m "Initial commit: DPS45"
git branch -M main
git remote add origin https://github.com/ваш-username/dps45.git
git push -u origin main
```

### Шаг 2: Импорт в Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите **"Add New..."** → **"Project"**
3. Выберите **"Import Git Repository"**
4. Найдите ваш репозиторий `dps45`
5. Нажмите **"Import"**

### Шаг 3: Настройка проекта

На странице конфигурации:

1. **Framework Preset**: Оставьте "Other" (или выберите "Express")
2. **Root Directory**: Оставьте `./`
3. **Build Command**: Оставьте пустым (не требуется)
4. **Output Directory**: Оставьте пустым
5. Нажмите **"Deploy"** (пока без переменных окружения)

⚠️ Первый деплой будет неуспешным - это нормально!

### Шаг 4: Добавление переменных окружения

1. После неудачного деплоя, перейдите в **Settings** → **Environment Variables**
2. Добавьте следующие переменные:

#### Production переменные

```
SUPABASE_URL = https://ваш-проект.supabase.co
SUPABASE_ANON_KEY = ваш-anon-ключ
ADMIN_PASSWORD = ваш_безопасный_пароль
JWT_SECRET = ваш_jwt_secret
NODE_ENV = production
```

3. Для каждой переменной:
   - Введите **Key** (название)
   - Введите **Value** (значение)
   - Выберите **Environment**: `Production`, `Preview`, `Development`
   - Нажмите **"Save"**

### Шаг 5: Повторный деплой

1. Перейдите в **Deployments**
2. Найдите последний деплой
3. Нажмите **"..."** → **"Redeploy"**
4. Дождитесь завершения

### Шаг 6: Проверка

1. Откройте URL вашего проекта (например: `https://dps45.vercel.app`)
2. Проверьте:
   - ✅ Карта загружается
   - ✅ Маркеры отображаются
   - ✅ Голосование работает
   - ✅ Админка доступна `/admin`

## Вариант 2: Деплой через Vercel CLI

### Установка Vercel CLI

```bash
npm install -g vercel
```

### Логин

```bash
vercel login
```

### Деплой

```bash
# Из корня проекта
vercel

# Следуйте инструкциям:
# - Set up and deploy? Yes
# - Which scope? Выберите ваш аккаунт
# - Link to existing project? No
# - What's your project's name? dps45
# - In which directory is your code located? ./
```

### Добавление переменных окружения через CLI

```bash
vercel env add SUPABASE_URL
# Введите значение
# Выберите environments: Production, Preview, Development

vercel env add SUPABASE_ANON_KEY
# Повторите для всех переменных
```

### Повторный деплой с переменными

```bash
vercel --prod
```

## Вариант 3: Деплой ZIP файла

1. Создайте ZIP архив проекта (исключая `node_modules`)
2. Перейдите на [vercel.com/new](https://vercel.com/new)
3. Загрузите ZIP файл
4. Добавьте переменные окружения
5. Deploy!

## Настройка домена (опционально)

### Использование поддомена Vercel

По умолчанию ваш проект будет доступен по адресу:
```
https://dps45.vercel.app
```

Вы можете изменить это:
1. **Settings** → **Domains**
2. Введите желаемое имя: `dps45-shumikha`
3. Получите: `https://dps45-shumikha.vercel.app`

### Подключение своего домена

1. Купите домен (например, на reg.ru, nic.ru)
2. В Vercel: **Settings** → **Domains**
3. Добавьте ваш домен: `dps45.ru`
4. Скопируйте DNS записи из Vercel
5. Добавьте DNS записи у вашего регистратора
6. Дождитесь propagation (~24 часа)

## Автоматическое обновление

После настройки GitHub + Vercel:

```bash
# Внесите изменения
git add .
git commit -m "Updated feature X"
git push

# Vercel автоматически задеплоит новую версию!
```

## Мониторинг и логи

### Просмотр логов

1. Перейдите в **Deployments**
2. Выберите деплой
3. Откройте **Runtime Logs**

### Просмотр аналитики

1. Откройте **Analytics**
2. Смотрите:
   - Количество посетителей
   - Время загрузки
   - География пользователей

## Проблемы и решения

### Ошибка: "Missing environment variables"

**Решение:** 
1. Проверьте Settings → Environment Variables
2. Убедитесь, что все переменные добавлены
3. Redeploy проект

### Ошибка: "Serverless Function has timed out"

**Решение:**
1. Vercel имеет лимит 10 секунд на Hobby плане
2. Оптимизируйте медленные запросы к базе
3. Добавьте индексы в Supabase

### Ошибка: "CORS blocked"

**Решение:**
1. Обновите `FRONTEND_URL` в environment variables
2. Укажите правильный домен Vercel
3. Redeploy

### 404 на `/admin`

**Решение:**
1. Проверьте `vercel.json` - должна быть правильная конфигурация routes
2. Убедитесь, что файл `public/admin.html` существует

## Production чеклист

Перед запуском в production:

- [ ] Все переменные окружения добавлены
- [ ] `NODE_ENV=production` установлен
- [ ] `ADMIN_PASSWORD` - надежный пароль (минимум 12 символов)
- [ ] `JWT_SECRET` - длинная случайная строка
- [ ] Supabase Row Level Security включен
- [ ] Протестировано голосование
- [ ] Протестирована админка
- [ ] Настроен домен (опционально)
- [ ] Проверены логи на наличие ошибок

## Лимиты бесплатного плана Vercel

- ✅ **100 GB** bandwidth/месяц
- ✅ **100** deployments/день
- ✅ **Unlimited** проектов
- ✅ **Serverless Functions**: 100 часов/месяц
- ⚠️ **Время выполнения функции**: 10 секунд max
- ⚠️ **Размер функции**: 50 MB max

Для DPS45 этого более чем достаточно!

## Обновление production

### Через Git

```bash
git add .
git commit -m "Update posts"
git push
# Vercel автоматически обновит
```

### Через CLI

```bash
vercel --prod
```

### Откат к предыдущей версии

1. **Deployments**
2. Найдите стабильную версию
3. **"..."** → **"Promote to Production"**

## Мониторинг стоимости

Vercel бесплатен до определенных лимитов:

1. Откройте **Usage**
2. Следите за:
   - Bandwidth
   - Build minutes
   - Serverless function invocations

Если приближаетесь к лимитам:
- Оптимизируйте изображения
- Добавьте кеширование
- Рассмотрите платный план ($20/мес)

## Следующие шаги

После успешного деплоя:

1. ✅ Поделитесь ссылкой с пользователями
2. ✅ Настройте мониторинг (например, UptimeRobot)
3. ✅ Добавьте Google Analytics (опционально)
4. ✅ Создайте backup базы данных

---

Поздравляем! Ваше приложение DPS45 теперь в production! 🚀
