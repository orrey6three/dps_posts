declare global {
  interface Window {
    ymaps?: any;
    __DPS_VK_MINIAPP__?: boolean;
    __DPS_CONFIG__?: { supabaseUrl?: string; supabaseAnonKey?: string };
    vkBridge?: { send: (method: string, params?: object) => Promise<unknown> };
  }
}

export {};
