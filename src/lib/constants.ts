/** Минимум точечных меток для включения кластеризации (React и legacy). */
export const CLUSTER_MIN_MARKERS = 28;

/** Размер кастомных маркеров на карте (пиксели головы пина). */
export type MarkerSizePreset = "s" | "m" | "l";

export const MARKER_PRESET_PX: Record<MarkerSizePreset, number> = {
  s: 24,
  m: 32,
  l: 42,
};

export const CITY_COORDS: Record<string, [number, number]> = {
  shchuchye: [55.2133, 62.7634],
  shumikha: [55.2255, 63.2982],
  mishkino: [55.3385, 63.9168]
};

export const CITY_LABELS: Record<string, string> = {
  shchuchye: "Щучье",
  shumikha: "Шумиха",
  mishkino: "Мишкино"
};

export const MARKER_TYPES = ["ДПС", "Патруль", "Нужна помощь", "Вопрос", "Чисто"] as const;

export const TAGS_BY_TYPE: Record<string, string[]> = {
  ДПС: [
    "Одинокий",
    "ДвеПалки",
    "ТриПалки",
    "ВсехПодряд",
    "Тонировка",
    "Пешеходы",
    "Страховка",
    "вОбеСтороны"
  ],
  Патруль: ["Одинокий", "ВсехПодряд", "вОбеСтороны"],
  "Нужна помощь": ["Прикурите", "Обсох", "ВозьмитеНаТрос", "НуженДомкрат"],
  Вопрос: ["НеРаботаетСветофор", "Яма", "ДТП", "ДорожныеРаботы"],
  Чисто: []
};
