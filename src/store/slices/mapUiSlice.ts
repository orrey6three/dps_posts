import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarkerSizePreset } from "@/lib/constants";
import type { PostRow } from "@/types/models";

export type MapPanel = "new" | "settings" | "profile" | "details" | null;

export type MapUiState = {
  city: string;
  markerPreset: MarkerSizePreset;
  selectedPost: PostRow | null;
  addMode: boolean;
  pendingCoords: [number, number] | null;
  newType: string;
  newComment: string;
  newTags: string[];
  activePanel: MapPanel;
  sheetExpanded: boolean;
  notice: string;
};

const initialState: MapUiState = {
  city: "shumikha",
  markerPreset: "m",
  selectedPost: null,
  addMode: false,
  pendingCoords: null,
  newType: "ДПС",
  newComment: "",
  newTags: [],
  activePanel: null,
  sheetExpanded: false,
  notice: "",
};

export const mapUiSlice = createSlice({
  name: "mapUi",
  initialState,
  reducers: {
    hydrateFromStorage(state, action: PayloadAction<{ city: string; markerPreset: MarkerSizePreset }>) {
      state.city = action.payload.city;
      state.markerPreset = action.payload.markerPreset;
    },
    setCity(state, action: PayloadAction<string>) {
      state.city = action.payload;
    },
    setMarkerPreset(state, action: PayloadAction<MarkerSizePreset>) {
      state.markerPreset = action.payload;
    },
    setSelectedPost(state, action: PayloadAction<PostRow | null>) {
      state.selectedPost = action.payload;
    },
    setAddMode(state, action: PayloadAction<boolean>) {
      state.addMode = action.payload;
    },
    setPendingCoords(state, action: PayloadAction<[number, number] | null>) {
      state.pendingCoords = action.payload;
    },
    setNewType(state, action: PayloadAction<string>) {
      state.newType = action.payload;
    },
    setNewComment(state, action: PayloadAction<string>) {
      state.newComment = action.payload;
    },
    setNewTags(state, action: PayloadAction<string[]>) {
      state.newTags = action.payload;
    },
    setActivePanel(state, action: PayloadAction<MapPanel>) {
      state.activePanel = action.payload;
    },
    setSheetExpanded(state, action: PayloadAction<boolean>) {
      state.sheetExpanded = action.payload;
    },
    toggleSheetExpanded(state) {
      state.sheetExpanded = !state.sheetExpanded;
    },
    setNotice(state, action: PayloadAction<string>) {
      state.notice = action.payload;
    },
    clearNotice(state) {
      state.notice = "";
    },
    togglePanel(state, action: PayloadAction<Exclude<MapPanel, null>>) {
      const panel = action.payload;
      if (state.activePanel === panel) state.activePanel = null;
      else {
        state.activePanel = panel;
        state.sheetExpanded = false;
      }
    },
    resetNewMarkerDraft(state) {
      state.pendingCoords = null;
      state.newComment = "";
      state.newTags = [];
    },
    closeSheet(state) {
      state.activePanel = null;
      state.addMode = false;
    },
  },
});

export const mapUiReducer = mapUiSlice.reducer;
export const mapUiActions = mapUiSlice.actions;
