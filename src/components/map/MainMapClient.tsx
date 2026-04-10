"use client";

import { useEffect, useState } from "react";
import { AddPostBox } from "@/components/map/AddPostBox";
import { AuthBox } from "@/components/map/AuthBox";
import { PostDetailsBox } from "@/components/map/PostDetailsBox";
import { YandexMap } from "@/components/map/YandexMap";
import { CITY_LABELS } from "@/lib/constants";
import { getOrCreateDeviceId, readStorage, writeStorage } from "@/lib/storage";
import type { AuthUser, PostRow } from "@/types/models";

type Props = { yandexApiKey: string };

export function MainMapClient({ yandexApiKey }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null);
  const [city, setCity] = useState("shumikha");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [markerSize, setMarkerSize] = useState(32);
  const [addMode, setAddMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<[number, number] | null>(null);
  const [newType, setNewType] = useState("ДПС");
  const [newComment, setNewComment] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setCity(readStorage("dps45_city", "shumikha"));
    setTheme(readStorage("dps45_theme", "light"));
    setMarkerSize(readStorage("dps45_marker_size", 32));
    getOrCreateDeviceId();
    void loadMe();
    void loadPosts();
    const id = setInterval(() => void loadPosts(), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => writeStorage("dps45_city", city), [city]);
  useEffect(() => writeStorage("dps45_theme", theme), [theme]);
  useEffect(() => writeStorage("dps45_marker_size", markerSize), [markerSize]);

  async function loadMe() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) setUser((await res.json()).user);
  }

  async function loadPosts() {
    const res = await fetch("/api/posts");
    if (!res.ok) return;
    const data = await res.json();
    setPosts(data.posts ?? []);
    if (selectedPost) {
      const updated = (data.posts ?? []).find((p: PostRow) => p.post_id === selectedPost.post_id);
      if (updated) setSelectedPost(updated);
    }
  }

  async function auth(endpoint: "login" | "register", username: string, password: string) {
    const res = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error ?? "Ошибка авторизации");
    setUser(data.user);
    writeStorage("dps45_device_id", data.user.id);
    setNotice(endpoint === "login" ? "Вход выполнен" : "Аккаунт создан");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setNotice("Вы вышли из аккаунта");
  }

  async function createMarker() {
    if (!user) return setNotice("Сначала войдите в аккаунт");
    if (!pendingCoords) return setNotice("Сначала выберите точку на карте");
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: newType,
        type: newType,
        comment: newComment,
        tags: newTags,
        latitude: pendingCoords[0],
        longitude: pendingCoords[1],
        address: `${CITY_LABELS[city]}`
      })
    });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error ?? "Ошибка создания метки");
    setPendingCoords(null);
    setNewComment("");
    setNewTags([]);
    setNotice("Метка создана");
    await loadPosts();
  }

  async function vote(voteType: "relevant" | "irrelevant") {
    if (!selectedPost) return;
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ post_id: selectedPost.post_id, vote_type: voteType })
    });
    const data = await res.json();
    setNotice(data.message ?? data.error ?? "Готово");
    await loadPosts();
  }

  async function deleteCurrentPost() {
    if (!selectedPost) return;
    const res = await fetch(`/api/posts/${selectedPost.post_id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error ?? "Ошибка удаления");
    setSelectedPost(null);
    setNotice("Метка удалена");
    await loadPosts();
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <YandexMap
        apiKey={yandexApiKey}
        posts={posts}
        city={city}
        theme={theme}
        markerSize={markerSize}
        addMode={addMode}
        onMapClick={(coords) => {
          setPendingCoords(coords);
          setAddMode(false);
        }}
        onMarkerClick={setSelectedPost}
      />
      <aside className="panel">
        <div className="card row wrap">
          {Object.keys(CITY_LABELS).map((key) => (
            <button key={key} className={`chip ${city === key ? "chip-active" : ""}`} onClick={() => setCity(key)}>
              {CITY_LABELS[key]}
            </button>
          ))}
          <button className="button button-soft" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            Тема: {theme === "light" ? "Светлая" : "Тёмная"}
          </button>
          <input
            type="range"
            min={22}
            max={48}
            value={markerSize}
            onChange={(e) => setMarkerSize(Number(e.target.value))}
          />
        </div>
        <AuthBox user={user} onLogin={(u, p) => auth("login", u, p)} onRegister={(u, p) => auth("register", u, p)} onLogout={logout} />
        <AddPostBox
          addMode={addMode}
          pendingCoords={pendingCoords}
          type={newType}
          comment={newComment}
          tags={newTags}
          setType={setNewType}
          setComment={setNewComment}
          setTags={setNewTags}
          onStartAdd={() => setAddMode((v) => !v)}
          onSubmit={createMarker}
        />
        <PostDetailsBox post={selectedPost} user={user} onVote={vote} onDelete={deleteCurrentPost} />
        {notice && <div className="notice">{notice}</div>}
      </aside>
    </main>
  );
}
