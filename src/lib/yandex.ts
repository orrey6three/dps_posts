let yandexPromise: Promise<any> | null = null;

export function loadYandexMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (yandexPromise) return yandexPromise;

  yandexPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${apiKey}`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) return reject(new Error("Yandex Maps API not found"));
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error("Не удалось загрузить Yandex Maps"));
    document.head.appendChild(script);
  });

  return yandexPromise;
}
