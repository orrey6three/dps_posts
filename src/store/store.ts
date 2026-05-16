import { configureStore } from "@reduxjs/toolkit";
import { listenerMiddleware } from "@/store/listenerMiddleware";
import { rootReducer } from "@/store/rootReducer";

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = import("@/store/rootReducer").RootState;
export type AppDispatch = typeof store.dispatch;
