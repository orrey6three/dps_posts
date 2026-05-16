import { combineReducers } from "@reduxjs/toolkit";
import { mapAppConfigReducer } from "@/store/slices/mapAppConfigSlice";
import { mapSessionReducer } from "@/store/slices/mapSessionSlice";
import { mapUiReducer } from "@/store/slices/mapUiSlice";
import { postsReducer } from "@/store/slices/postsSlice";

export const rootReducer = combineReducers({
  posts: postsReducer,
  mapUi: mapUiReducer,
  mapSession: mapSessionReducer,
  mapAppConfig: mapAppConfigReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
