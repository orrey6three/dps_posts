"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Map,
  Plus,
  SlidersHorizontal,
  User as UserIcon,
  ZoomIn,
} from "lucide-react";
import { AddPostBox } from "@/components/map/AddPostBox";
import { AuthBox } from "@/components/map/AuthBox";
import { PostDetailsBox } from "@/components/map/PostDetailsBox";
import { YandexMap } from "@/components/map/YandexMap";
import { Chip } from "@/components/ui/Chip";
import { Toast } from "@/components/ui/Toast";
import { CITY_LABELS } from "@/lib/constants";
import { getOrCreateDeviceId, readStorage, writeStorage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { AuthUser, PostRow } from "@/types/models";

type Props = { yandexApiKey: string };
/** Which panel is open in the bottom sheet — null = sheet closed */
type Panel = "new" | "settings" | "profile" | "details" | null;

export function MainMapClient({ yandexApiKey }: Props) {
  // ── Data ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null);
  const [city, setCity] = useState("shumikha");
  const [markerSize, setMarkerSize] = useState(32);
  const [online, setOnline] = useState(true);

  // ── New-post form ─────────────────────────────────────────────────────
  const [addMode, setAddMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<[number, number] | null>(null);
  const [newType, setNewType] = useState("ДПС");
  const [newComment, setNewComment] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);

  // ── UI ────────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedPostRef = useRef<PostRow | null>(null);
  useEffect(() => { selectedPostRef.current = selectedPost; }, [selectedPost]);
  const postsSignatureRef = useRef<string>("");
  const reloadPostsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleReloadPosts() {
    if (reloadPostsDebounceRef.current) clearTimeout(reloadPostsDebounceRef.current);
    reloadPostsDebounceRef.current = setTimeout(() => {
      reloadPostsDebounceRef.current = null;
      void loadPosts();
    }, 320);
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  // (панель открывается напрямую в onMarkerClick — без useEffect)

  // ── Bootstrap ─────────────────────────────────────────────────────────
  useEffect(() => {
    setCity(readStorage("dps45_city", "shumikha"));
    setMarkerSize(readStorage("dps45_marker_size", 32));
    getOrCreateDeviceId();
    void loadMe();
    void loadPosts();

    // ── Realtime Subscription ───────────────────────────────────────────
    const channel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          // Whenever something changes, reload the list to get fresh data with votes
          scheduleReloadPosts();
        }
      )
      .subscribe();

    const onVis     = () => { if (document.visibilityState === "visible") scheduleReloadPosts(); };
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);

    return () => {
      if (reloadPostsDebounceRef.current) clearTimeout(reloadPostsDebounceRef.current);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => writeStorage("dps45_city", city), [city]);
  useEffect(() => writeStorage("dps45_marker_size", markerSize), [markerSize]);

  // ── API helpers ───────────────────────────────────────────────────────
  async function loadMe() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) setUser((await res.json()).user);
  }

  async function loadPosts() {
    const res = await fetch("/api/posts", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const nextPosts: PostRow[] = data.posts ?? [];
    const signature = nextPosts
      .map(
        (p) =>
          `${p.post_id}:${p.last_activity ?? p.last_relevant ?? p.created_at}:${p.relevant_count}:${p.irrelevant_count}`
      )
      .join("|");
    if (signature !== postsSignatureRef.current) {
      postsSignatureRef.current = signature;
      setPosts(nextPosts);
    }
    const sel = selectedPostRef.current;
    if (sel) {
      const updated = nextPosts.find((p) => p.post_id === sel.post_id);
      if (updated && updated !== sel) setSelectedPost(updated);
    }
  }

  async function auth(endpoint: "login" | "register", username: string, password: string) {
    const res = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error ?? "Ошибка авторизации");
    setUser(data.user);
    writeStorage("dps45_device_id", data.user.id);
    setNotice(endpoint === "login" ? "Добро пожаловать" : "Аккаунт создан");
    setActivePanel(null);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setNotice("Вы вышли из аккаунта");
  }

  async function createMarker() {
    if (!user) {
      setActivePanel("profile");
      return setNotice("Сначала войдите в аккаунт");
    }
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
        address: `${CITY_LABELS[city]}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error ?? "Ошибка создания метки");
    setPendingCoords(null);
    setNewComment("");
    setNewTags([]);
    setNotice("Метка опубликована");
    setActivePanel(null);
    await loadPosts();
  }

  async function vote(voteType: "relevant" | "irrelevant") {
    if (!selectedPost) return;
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ post_id: selectedPost.post_id, vote_type: voteType }),
    });
    const data = await res.json();
    setNotice(data.message ?? data.error ?? "Готово");
    await loadPosts();
  }

  async function deleteCurrentPost() {
    if (!selectedPost) return;
    const res = await fetch(`/api/posts/${selectedPost.post_id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error ?? "Ошибка удаления");
    setSelectedPost(null);
    setActivePanel(null);
    setNotice("Метка удалена");
    await loadPosts();
  }

  // ── UI helpers ────────────────────────────────────────────────────────
  /** Toggle a sheet panel (like a radio — second tap closes) */
  function togglePanel(panel: Exclude<Panel, null>) {
    setActivePanel((prev) => {
      if (prev === panel) { return null; }
      setSheetExpanded(false);
      return panel;
    });
  }

  /** FAB: open/close the new-marker form */
  function handleFAB() {
    if (activePanel === "new") {
      setActivePanel(null);
      setAddMode(false);
      setPendingCoords(null);
    } else {
      setActivePanel("new");
      setSheetExpanded(false);
      // don't auto-start addMode — user taps "Выбрать точку" to enter targeting
    }
  }

  /** "Выбрать точку" button in AddPostBox */
  function handleStartAdd() {
    if (addMode) {
      setAddMode(false);
    } else {
      setAddMode(true);
      setActivePanel(null); // close sheet so full map is visible
    }
  }

  const sheetOpen = activePanel !== null;
  const userInitial = user?.username?.slice(0, 1).toUpperCase() ?? "";

  const handleMapClick = useCallback((coords: [number, number]) => {
    setPendingCoords(coords);
    setAddMode(false);
    setActivePanel("new");
  }, []);

  const handleMarkerClick = useCallback((post: PostRow) => {
    setSelectedPost(post);
    setActivePanel("details");
    setSheetExpanded(false);
    setAddMode(false);
  }, []);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* ── Full-screen map ─────────────────────────────────────────────── */}
      <YandexMap
        apiKey={yandexApiKey}
        posts={posts}
        city={city}
        markerSize={markerSize}
        addMode={addMode}
        onMapClick={handleMapClick}
        onMarkerClick={handleMarkerClick}
      />
      <div className="ui-map-vignette" aria-hidden />

      {/* ── Top status pill ─────────────────────────────────────────────── */}
      <div className="ui-status-bar" aria-live="polite">
        <span className="ui-live-dot" aria-hidden />
        <span
          className="font-bold tracking-normal text-[13px]"
          style={{ color: "var(--color-brand-deep)" }}
        >
          DPS45
        </span>
        <span className="ui-soft text-[12px]">
          <span className="ui-mono">{posts.length}</span> меток
        </span>
        {!online && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "var(--color-danger-tint)", color: "var(--color-danger)" }}
          >
            Offline
          </span>
        )}
      </div>

      {/* ── Add-mode hint ───────────────────────────────────────────────── */}
      {addMode && (
        <div className="ui-add-hint" role="status">
          <Crosshair className="h-4 w-4 animate-pulse" aria-hidden />
          Нажмите на карту чтобы поставить метку
        </div>
      )}

      {/* ── Sheet backdrop ──────────────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-20"
          style={{
            background: "rgba(23, 19, 31, 0.14)",
            backdropFilter: "blur(2px)",
            transition: "opacity 280ms ease",
          }}
          onClick={() => {
            setActivePanel(null);
            setAddMode(false);
          }}
          aria-hidden
        />
      )}

      {/* ── Bottom sheet ────────────────────────────────────────────────── */}
      <div
        className="ui-sheet"
        style={{
          transform: sheetOpen ? "translateY(0)" : "translateY(110%)",
          maxHeight: sheetExpanded ? "92dvh" : "65dvh",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Панель"
      >
        {/* Drag handle */}
        <button
          type="button"
          onClick={() => setSheetExpanded((v) => !v)}
          className="w-full pt-3 pb-2.5 flex justify-center cursor-pointer focus-visible:outline-none"
          aria-label={sheetExpanded ? "Свернуть панель" : "Развернуть панель"}
        >
          <span className="ui-sheet-handle" />
        </button>

        {/* Content */}
        <div
          className="overflow-y-auto flex-1"
          key={activePanel ?? "empty"}
          style={{ animation: "section-in 240ms ease-out" }}
        >
          {activePanel === "new" && (
            <>
              <SheetHeader
                title="Новая метка"
                subtitle="Укажите место, тип и отправьте"
              />
              <AddPostBox
                addMode={addMode}
                pendingCoords={pendingCoords}
                type={newType}
                comment={newComment}
                tags={newTags}
                setType={setNewType}
                setComment={setNewComment}
                setTags={setNewTags}
                onStartAdd={handleStartAdd}
                onSubmit={createMarker}
              />
            </>
          )}

          {activePanel === "settings" && (
            <>
              <SheetHeader title="Настройки карты" />
              <MapSettingsPanel
                city={city}
                setCity={setCity}
                markerSize={markerSize}
                setMarkerSize={setMarkerSize}
              />
            </>
          )}

          {activePanel === "profile" && (
            <>
              <SheetHeader title={user ? "Мой профиль" : "Вход / Регистрация"} />
              <AuthBox
                user={user}
                onLogin={(u, p) => auth("login", u, p)}
                onRegister={(u, p) => auth("register", u, p)}
                onLogout={logout}
              />
            </>
          )}

          {activePanel === "details" && (
            <>
              <SheetHeader title="Детали метки" />
              <PostDetailsBox
                post={selectedPost}
                user={user}
                onVote={vote}
                onDelete={deleteCurrentPost}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Floating toast ──────────────────────────────────────────────── */}
      {notice && (
        <div className="ui-toast-float">
          <Toast>{notice}</Toast>
        </div>
      )}

      {/* ── Bottom navigation bar ───────────────────────────────────────── */}
      <nav className="ui-bottom-nav" aria-label="Навигация приложения">
        {/* Карта — collapses sheet / goes to map */}
        <button
          type="button"
          onClick={() => {
            setActivePanel(null);
            setAddMode(false);
          }}
          className={`ui-nav-btn ${activePanel === null && !addMode ? "ui-nav-btn-active" : ""}`}
          aria-label="Карта"
        >
          <Map className="h-5 w-5" aria-hidden />
          <span>Карта</span>
        </button>

        {/* FAB — central add button */}
        <div className="relative flex items-center justify-center flex-shrink-0 px-2">
          <button
            type="button"
            onClick={handleFAB}
            className={`ui-fab ${activePanel === "new" ? "ui-fab-active" : ""}`}
            aria-label={activePanel === "new" ? "Закрыть" : "Добавить метку"}
            aria-pressed={activePanel === "new"}
          >
            <Plus
              className="h-7 w-7"
              style={{
                transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: activePanel === "new" ? "rotate(45deg)" : "rotate(0deg)",
              }}
              aria-hidden
            />
          </button>
        </div>

        {/* Настройки */}
        <button
          type="button"
          onClick={() => togglePanel("settings")}
          className={`ui-nav-btn ${activePanel === "settings" ? "ui-nav-btn-active" : ""}`}
          aria-label="Настройки"
          aria-pressed={activePanel === "settings"}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
          <span>Настройки</span>
        </button>

        {/* Профиль */}
        <button
          type="button"
          onClick={() => togglePanel("profile")}
          className={`ui-nav-btn ${activePanel === "profile" ? "ui-nav-btn-active" : ""}`}
          aria-label={user ? "Профиль" : "Войти"}
          aria-pressed={activePanel === "profile"}
        >
          {user ? (
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #21182f, #100b18)",
                outline: activePanel === "profile" ? "2px solid rgba(239, 68, 68, 0.3)" : "none",
                outlineOffset: "2px",
              }}
            >
              {userInitial}
            </span>
          ) : (
            <UserIcon className="h-5 w-5" aria-hidden />
          )}
          <span>{user ? (user.username.length > 7 ? user.username.slice(0, 6) + "…" : user.username) : "Войти"}</span>
        </button>
      </nav>
    </main>
  );
}

/* ─── Sheet header ─── */
function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 pb-1 pt-0.5">
      <h2
        className="text-[16px] font-bold tracking-normal leading-snug"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="ui-soft text-[12px] mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

/* ─── Settings panel (city + marker size) ─── */
function MapSettingsPanel({
  city,
  setCity,
  markerSize,
  setMarkerSize,
}: {
  city: string;
  setCity: (v: string) => void;
  markerSize: number;
  setMarkerSize: (v: number) => void;
}) {
  return (
    <div className="ui-section">
      <div className="grid gap-1.5">
        <span className="ui-eyebrow">Город</span>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(CITY_LABELS).map((key) => (
            <Chip key={key} active={city === key} onClick={() => setCity(key)}>
              {CITY_LABELS[key]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="ui-eyebrow flex items-center gap-1.5">
          <ZoomIn className="h-3 w-3" aria-hidden />
          Размер маркеров
        </span>
        <div
          className="flex items-center gap-3 rounded-[12px] px-3 py-2.5"
          style={{
            background: "rgba(255, 255, 255, 0.62)",
            border: "1px solid var(--color-border)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
          }}
        >
          <input
            type="range"
            min={22}
            max={48}
            value={markerSize}
            onChange={(e) => setMarkerSize(Number(e.target.value))}
            className="flex-1 cursor-pointer accent-[color:var(--color-brand-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand-accent)]"
            aria-label="Размер маркеров"
          />
          <span
            className="ui-mono w-12 text-right text-[12px] font-semibold"
            style={{ color: "var(--color-brand-deep)" }}
          >
            {markerSize}px
          </span>
        </div>
      </div>
    </div>
  );
}
