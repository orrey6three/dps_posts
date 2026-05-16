declare global {
  interface Window {
    ymaps?: any;
    __DPS_VK_MINIAPP__?: boolean;
    vkBridge?: { send: (method: string, params?: object) => Promise<unknown> };
  }
}

export {};
