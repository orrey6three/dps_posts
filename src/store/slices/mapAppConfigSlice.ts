import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { CityEntry } from "@/lib/cities";

export const fetchAppConfig = createAsyncThunk("mapAppConfig/fetch", async () => {
  const res = await fetch("/api/app-config", { cache: "no-store" });
  if (!res.ok) throw new Error("app_config_fetch_failed");
  const data = await res.json();
  return {
    cityCatalog: (Array.isArray(data.cities) ? data.cities : []) as CityEntry[],
    stripeCheckoutEnabled: !!data.billing?.stripeCheckout,
    donateUrl: typeof data.donateUrl === "string" ? data.donateUrl : "",
  };
});

type MapAppConfigState = {
  cityCatalog: CityEntry[];
  stripeCheckoutEnabled: boolean;
  donateUrl: string;
};

const initialState: MapAppConfigState = {
  cityCatalog: [],
  stripeCheckoutEnabled: false,
  donateUrl: "",
};

export const mapAppConfigSlice = createSlice({
  name: "mapAppConfig",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(fetchAppConfig.fulfilled, (state, action) => {
      state.cityCatalog = action.payload.cityCatalog;
      state.stripeCheckoutEnabled = action.payload.stripeCheckoutEnabled;
      state.donateUrl = action.payload.donateUrl;
    });
  },
});

export const mapAppConfigReducer = mapAppConfigSlice.reducer;
