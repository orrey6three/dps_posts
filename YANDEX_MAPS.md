# 🔥 Яндекс.Карты в DPS45

## Почему именно Яндекс.Карты

**Лучший выбор для российских проектов!**

✅ **Детализированные карты России** - улицы, дома, организации
✅ **Без регистрации** - работает из коробки
✅ **Бесплатно** - 25,000 запросов/день
✅ **На русском** - API, документация, интерфейс
✅ **Плавные анимации** - flying transitions
✅ **Отличная геолокация** - точные координаты

## 🚀 Быстрый старт

### HTML

```html
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU"></script>
<div id="map" style="width: 100%; height: 100vh;"></div>
```

### JavaScript

```javascript
ymaps.ready(() => {
    const map = new ymaps.Map('map', {
        center: [55.2317, 63.2892],
        zoom: 13
    });
});
```

**Вот и всё!** Карта работает. 🎉

## 📦 Что использует DPS45

### Основные фичи

1. **Интерактивная карта** - zoom, pan, controls
2. **Кастомные маркеры** - с цветами по статусу
3. **Click events** - открытие bottom sheet
4. **Smooth animations** - плавный переход к маркеру
5. **Mobile-friendly** - touch gestures

### Цвета маркеров

```javascript
// Актуально (пост работает)
preset: 'islands#redIcon'
color: '#ef4444'

// Неактуально (поста нет)
preset: 'islands#grayIcon'
color: '#6b7280'

// Устарело (нет данных 6ч+)
preset: 'islands#darkGrayIcon'
color: '#4b5563'
```

## 🎨 Кастомизация

### Изменить центр и zoom

```javascript
// В app.js
center: [55.2317, 63.2892], // [широта, долгота]
zoom: 13 // 0-19
```

### Добавить контролы

```javascript
controls: [
    'zoomControl',        // Кнопки +/-
    'geolocationControl', // Определить местоположение
    'searchControl',      // Поиск
    'routeEditor',        // Построение маршрутов
    'trafficControl',     // Пробки
    'typeSelector',       // Схема/Спутник
    'fullscreenControl',  // Полный экран
    'rulerControl'        // Линейка
]
```

### Поменять тип карты

```javascript
// Схема (по умолчанию)
map.setType('yandex#map');

// Спутник
map.setType('yandex#satellite');

// Гибрид
map.setType('yandex#hybrid');
```

## 🔥 Production Features

### 1. Геолокация пользователя

Определяет где находится пользователь:

```javascript
navigator.geolocation.getCurrentPosition((position) => {
    map.setCenter([
        position.coords.latitude,
        position.coords.longitude
    ], 15);
});
```

### 2. Кластеризация

Для городов с 50+ постами:

```javascript
const clusterer = new ymaps.Clusterer({
    preset: 'islands#redClusterIcons'
});
clusterer.add(markers);
map.geoObjects.add(clusterer);
```

### 3. Heatmap голосований

Тепловая карта активности:

```javascript
ymaps.modules.require(['Heatmap'], (Heatmap) => {
    const heatmap = new Heatmap({
        data: [[55.2317, 63.2892, 10]],
        radius: 20
    });
    heatmap.setMap(map);
});
```

### 4. Маршруты между постами

```javascript
const route = new ymaps.multiRouter.MultiRoute({
    referencePoints: [
        [55.2317, 63.2892],
        [55.2350, 63.2890]
    ]
});
map.geoObjects.add(route);
```

## 📱 Mobile Optimization

### Touch gestures

Яндекс.Карты поддерживают:
- Pinch to zoom
- Swipe to pan
- Double tap to zoom
- Two-finger rotate

### Отключить ненужное

```javascript
// Отключить zoom колесиком
map.behaviors.disable('scrollZoom');

// Отключить перетаскивание
map.behaviors.disable('drag');

// Отключить мультитач
map.behaviors.disable('multiTouch');
```

## 🎯 API ключ (опционально)

Для production рекомендуется получить API ключ:

1. Зарегистрируйтесь: [developer.tech.yandex.ru](https://developer.tech.yandex.ru/)
2. Создайте JavaScript API ключ
3. Добавьте в URL:

```html
<script src="https://api-maps.yandex.ru/2.1/?apikey=YOUR_KEY&lang=ru_RU"></script>
```

**Лимиты:**
- **Без ключа**: работает, но может тормозить
- **С ключом**: 25,000 запросов/день бесплатно

## 🐛 Troubleshooting

### Карта не загружается

```javascript
// Проверьте что API загрузился
console.log(typeof ymaps); // должно быть 'object'

// Всегда используйте ymaps.ready()
ymaps.ready(() => {
    // ваш код здесь
});
```

### Маркеры не кликаются

```javascript
// Используйте e.preventDefault()
placemark.events.add('click', (e) => {
    e.preventDefault(); // Обязательно!
    showDetails();
});
```

### Bottom sheet не закрывается

```javascript
// Клик по карте должен закрывать sheet
map.events.add('click', () => {
    document.getElementById('bottom-sheet')
        .classList.remove('active');
});
```

## 📊 Производительность

| Метрика | Значение |
|---------|----------|
| Библиотека | ~150 KB |
| Инициализация | ~500 ms |
| FPS | 60 |
| Память | ~15 MB |

**Советы по оптимизации:**

1. Загружайте карту lazy (после скролла)
2. Используйте objectManager для 1000+ объектов
3. Кластеризуйте близкие маркеры
4. Отключите ненужные контролы

## 📚 Документация

- [Основы API](https://yandex.ru/dev/maps/jsapi/doc/2.1/quick-start/)
- [Примеры](https://yandex.ru/dev/maps/jsapi/doc/2.1/examples/)
- [Песочница](https://yandex.ru/dev/maps/jsapi/doc/2.1/dg/concepts/sandbox.html)

## 💡 Pro Tips

1. **Используйте geoQuery** для поиска ближайших постов
2. **Включите traffic** для отображения пробок
3. **Добавьте ruler** для измерения расстояний
4. **Используйте balloonTemplate** для кастомных подсказок
5. **Кешируйте координаты** в localStorage

## 🎯 Итог

Яндекс.Карты - топовый выбор для DPS45:
- ✅ Лучшие карты России
- ✅ Бесплатно и быстро
- ✅ Простая интеграция
- ✅ Куча фич

**DPS45 на Яндекс.Картах = 🔥🔥🔥**
