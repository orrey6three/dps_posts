import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser, UserPublicStats } from "@/types/models";

export const fetchMe = createAsyncThunk("mapSession/fetchMe", async () => {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) {
    return { user: null as AuthUser | null, userStats: null as UserPublicStats | null };
  }
  if (!res.ok) throw new Error("me_fetch_failed");
  const data = await res.json();
  return {
    user: (data.user ?? null) as AuthUser | null,
    userStats: (data.stats ?? null) as UserPublicStats | null,
  };
});

type MapSessionState = {
  user: AuthUser | null;
  userStats: UserPublicStats | null;
  online: boolean;
};

const initialState: MapSessionState = {
  user: null,
  userStats: null,
  online: true,
};

export const mapSessionSlice = createSlice({
  name: "mapSession",
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.online = action.payload;
    },
    clearSession(state) {
      state.user = null;
      state.userStats = null;
    },
    setSession(state, action: PayloadAction<{ user: AuthUser | null; userStats: UserPublicStats | null }>) {
      state.user = action.payload.user;
      state.userStats = action.payload.userStats;
    },
  },
  extraReducers(builder) {
    builder.addCase(fetchMe.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.userStats = action.payload.userStats;
    });
  },
});

export const mapSessionReducer = mapSessionSlice.reducer;
export const mapSessionActions = mapSessionSlice.actions;
