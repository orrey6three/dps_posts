import { createListenerMiddleware } from "@reduxjs/toolkit";
import { writeStorage } from "@/lib/storage";
import type { RootState } from "@/store/rootReducer";
import { fetchAppConfig } from "@/store/slices/mapAppConfigSlice";
import { mapUiActions } from "@/store/slices/mapUiSlice";
import { fetchPosts } from "@/store/slices/postsSlice";

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: fetchPosts.fulfilled,
  effect(action, listenerApi) {
    const items = action.payload.items;
    const sel = (listenerApi.getState() as RootState).mapUi.selectedPost;
    if (!sel) return;
    const next = items.find((p) => p.post_id === sel.post_id);
    if (next) listenerApi.dispatch(mapUiActions.setSelectedPost(next));
  },
});

listenerMiddleware.startListening({
  actionCreator: fetchAppConfig.fulfilled,
  effect(action, listenerApi) {
    const catalog = action.payload.cityCatalog;
    if (!catalog.length) return;
    const ids = new Set(catalog.map((c) => c.id));
    const city = (listenerApi.getState() as RootState).mapUi.city;
    if (!ids.has(city)) {
      const fb = catalog[0].id;
      listenerApi.dispatch(mapUiActions.setCity(fb));
      writeStorage("dps45_city", fb);
    }
  },
});
