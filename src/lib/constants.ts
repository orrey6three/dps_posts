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
