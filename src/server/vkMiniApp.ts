/**
 * CSP: кто может открыть страницу во фрейме (мини-приложение VK по URL).
 * Важно: домены vk-apps.com — отдельная зона встраивания у VK; без них клиент мог рвать загрузку.
 *
 * Не используем X-Frame-Options: у директивы только DENY / SAMEORIGIN; «ALLOWALL» не существует.
 * Разрешение встраивания задаётся только через frame-ancestors (и отсутствие чужого DENY у CDN).
 */
export const VK_MINIAPP_FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://vk.com https://*.vk.com https://vk.ru https://*.vk.ru https://m.vk.com https://m.vk.ru https://*.vk.me https://vk-apps.com https://*.vk-apps.com";
