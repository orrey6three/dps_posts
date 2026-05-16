import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PostRow } from "@/types/models";

function postsSignature(posts: PostRow[]): string {
  return posts
    .map(
      (p) =>
        `${p.post_id}:${p.last_activity ?? p.last_relevant ?? p.created_at}:${p.relevant_count}:${p.irrelevant_count}`
    )
    .join("|");
}

export const fetchPosts = createAsyncThunk("posts/fetchPosts", async () => {
  const res = await fetch("/api/posts", { cache: "no-store" });
  if (!res.ok) throw new Error("posts_fetch_failed");
  const data = await res.json();
  const items: PostRow[] = data.posts ?? [];
  return { items, signature: postsSignature(items) };
});

type PostsState = {
  items: PostRow[];
  signature: string;
};

const initialState: PostsState = {
  items: [],
  signature: "",
};

export const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(fetchPosts.fulfilled, (state, action) => {
      if (action.payload.signature !== state.signature) {
        state.items = action.payload.items;
        state.signature = action.payload.signature;
      }
    });
  },
});

export const postsReducer = postsSlice.reducer;
