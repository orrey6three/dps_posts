/**
 * CSP для встраивания главной страницы во фрейм клиента VK (мини-приложение по URL).
 * Должен совпадать с заголовком в next.config.ts.
 */
export const VK_MINIAPP_FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://vk.com https://*.vk.com https://vk.ru https://*.vk.ru https://m.vk.com https://m.vk.ru https://*.vk.me";
