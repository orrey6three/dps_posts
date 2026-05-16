"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Crosshair,
  Map,
  Plus,
  SlidersHorizontal,
  User as UserIcon,
} from "lucide-react";
import { AddPostBox } from "@/components/map/AddPostBox";
import { AuthBox } from "@/components/map/AuthBox";
import { PostDetailsBox } from "@/components/map/PostDetailsBox";
import { YandexMap } from "@/components/map/YandexMap";
import { Chip } from "@/components/ui/Chip";
import { Toast } from "@/components/ui/Toast";
import { CITY_COORDS, MARKER_PRESET_PX, type MarkerSizePreset } from "@/lib/constants";
import { boundsAroundCenter, getCityMapBounds, type CityEntry } from "@/lib/cities";
import { getOrCreateDeviceId, readStorage, writeStorage } from "@/lib/storage";
import { createRealtimeSupabase } from "@/lib/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAppConfig } from "@/store/slices/mapAppConfigSlice";
import { fetchMe, mapSessionActions } from "@/store/slices/mapSessionSlice";
import { mapUiActions, type MapPanel } from "@/store/slices/mapUiSlice";
import { fetchPosts } from "@/store/slices/postsSlice";
import { store } from "@/store/store";
import type { PostRow } from "@/types/models";

type Props = { yandexApiKey: string; supabaseUrl: string; supabaseAnonKey: string };

function loadMarkerPreset(): MarkerSizePreset {
  const presetRaw = readStorage<string>("dps45_marker_preset", "");
  if (presetRaw === "s" || presetRaw === "m" || presetRaw === "l") return presetRaw;
  const px = readStorage("dps45_marker_size", 32);
  if (typeof px === "number" && Number.isFinite(px)) {
    if (px <= 27) return "s";
    if (px <= 37) return "m";
    return "l";
  }
  return "m";
}

export function MainMapClient({ yandexApiKey, supabaseUrl, supabaseAnonKey }: Props) {
  const dispatch = useAppDispatch();
  const posts = useAppSelector((s) => s.posts.items);
  const user = useAppSelector((s) => s.mapSession.user);
  const userStats = useAppSelector((s) => s.mapSession.userStats);
  const online = useAppSelector((s) => s.mapSession.online);
  const cityCatalog = useAppSelector((s) => s.mapAppConfig.cityCatalog);
  const stripeCheckoutEnabled = useAppSelector((s) => s.mapAppConfig.stripeCheckoutEnabled);
  const donateUrl = useAppSelector((s) => s.mapAppConfig.donateUrl);

  const city = useAppSelector((s) => s.mapUi.city);
  const markerPreset = useAppSelector((s) => s.mapUi.markerPreset);
  const selectedPost = useAppSelector((s) => s.mapUi.selectedPost);
  const addMode = useAppSelector((s) => s.mapUi.addMode);
  const pendingCoords = useAppSelector((s) => s.mapUi.pendingCoords);
  const newType = useAppSelector((s) => s.mapUi.newType);
  const newComment = useAppSelector((s) => s.mapUi.newComment);
  const newTags = useAppSelector((s) => s.mapUi.newTags);
  const activePanel = useAppSelector((s) => s.mapUi.activePanel);
  const sheetExpanded = useAppSelector((s) => s.mapUi.sheetExpanded);
  const notice = useAppSelector((s) => s.mapUi.notice);

  const supabase = useMemo(
    () => createRealtimeSupabase(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  const reloadPostsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleReloadPosts() {
    if (reloadPostsDebounceRef.current) clearTimeout(reloadPostsDebounceRef.current);
    reloadPostsDebounceRef.current = setTimeout(() => {
      reloadPostsDebounceRef.current = null;
      void dispatch(fetchPosts());
    }, 320);
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => dispatch(mapUiActions.clearNotice()), 3200);
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  useEffect(() => {
    dispatch(
      mapUiActions.hydrateFromStorage({
        city: readStorage("dps45_city", "shumikha"),
        markerPreset: loadMarkerPreset(),
      })
    );
    getOrCreateDeviceId();
    void dispatch(fetchAppConfig());
    void dispatch(fetchMe());
    void dispatch(fetchPosts());

    const channel = supabase
      ? supabase
          .channel("posts-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "posts" },
            () => {
              scheduleReloadPosts();
            }
          )
          .subscribe()
      : null;

    const onVis = () => {
      if (document.visibilityState === "visible") scheduleReloadPosts();
    };
    const onOnline = () => dispatch(mapSessionActions.setOnline(true));
    const onOffline = () => dispatch(mapSessionActions.setOnline(false));

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (typeof navigator !== "undefined") dispatch(mapSessionActions.setOnline(navigator.onLine));

    return () => {
      if (reloadPostsDebounceRef.current) clearTimeout(reloadPostsDebounceRef.current);
      if (supabase && channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [dispatch, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const billing = new URLSearchParams(window.location.search).get("billing");
    if (!billing) return;
    if (billing === "success") dispatch(mapUiActions.setNotice("Подписка оформлена — спасибо!"));
    if (billing === "cancel") dispatch(mapUiActions.setNotice("Оплата отменена"));
    window.history.replaceState({}, "", window.location.pathname);
    if (billing === "success") void dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    writeStorage("dps45_city", city);
  }, [city]);

  useEffect(() => {
    writeStorage("dps45_marker_preset", markerPreset);
    writeStorage("dps45_marker_size", MARKER_PRESET_PX[markerPreset]);
  }, [markerPreset]);

  async function auth(endpoint: "login" | "register", username: string, password: string) {
    const res = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      dispatch(mapUiActions.setNotice(data.error ?? "Ошибка авторизации"));
      return;
    }
    writeStorage("dps45_device_id", data.user.id);
    await dispatch(fetchMe());
    dispatch(mapUiActions.setNotice(endpoint === "login" ? "Добро пожаловать" : "Аккаунт создан"));
    dispatch(mapUiActions.setActivePanel(null));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    dispatch(mapSessionActions.clearSession());
    dispatch(mapUiActions.setNotice("Вы вышли из аккаунта"));
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось сменить пароль");
    dispatch(mapUiActions.setNotice("Пароль обновлён"));
  }

  async function handleSubscribe() {
    const res = await fetch("/api/billing/checkout", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      dispatch(mapUiActions.setNotice(typeof data.error === "string" ? data.error : "Онлайн-оплата недоступна"));
      return;
    }
    if (typeof data.url === "string") window.location.href = data.url;
  }

  async function createMarker() {
    const { mapUi, mapSession, mapAppConfig } = store.getState();
    if (!mapSession.user) {
      dispatch(mapUiActions.setActivePanel("profile"));
      dispatch(mapUiActions.setNotice("Сначала войдите в аккаунт"));
      return;
    }
    if (!mapUi.pendingCoords) {
      dispatch(mapUiActions.setNotice("Сначала выберите точку на карте"));
      return;
    }
    const cityLabel = mapAppConfig.cityCatalog.find((c) => c.id === mapUi.city)?.label ?? mapUi.city;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: mapUi.newType,
        type: mapUi.newType,
        comment: mapUi.newComment,
        tags: mapUi.newTags,
        latitude: mapUi.pendingCoords[0],
        longitude: mapUi.pendingCoords[1],
        address: cityLabel,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      dispatch(mapUiActions.setNotice(data.error ?? "Ошибка создания метки"));
      return;
    }
    dispatch(mapUiActions.resetNewMarkerDraft());
    dispatch(mapUiActions.setNotice("Метка опубликована"));
    dispatch(mapUiActions.setActivePanel(null));
    await dispatch(fetchPosts());
  }

  async function vote(voteType: "relevant" | "irrelevant") {
    const sp = store.getState().mapUi.selectedPost;
    if (!sp) return;
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ post_id: sp.post_id, vote_type: voteType }),
    });
    const data = await res.json();
    dispatch(mapUiActions.setNotice(data.message ?? data.error ?? "Готово"));
    await dispatch(fetchPosts());
  }

  async function deleteCurrentPost() {
    const sp = store.getState().mapUi.selectedPost;
    if (!sp) return;
    const res = await fetch(`/api/posts/${sp.post_id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      dispatch(mapUiActions.setNotice(data.error ?? "Ошибка удаления"));
      return;
    }
    dispatch(mapUiActions.setSelectedPost(null));
    dispatch(mapUiActions.setActivePanel(null));
    dispatch(mapUiActions.setNotice("Метка удалена"));
    await dispatch(fetchPosts());
  }

  function togglePanel(panel: Exclude<MapPanel, null>) {
    dispatch(mapUiActions.togglePanel(panel));
  }

  function handleFAB() {
    if (activePanel === "new") {
      dispatch(mapUiActions.setActivePanel(null));
      dispatch(mapUiActions.setAddMode(false));
      dispatch(mapUiActions.setPendingCoords(null));
    } else {
      dispatch(mapUiActions.setActivePanel("new"));
      dispatch(mapUiActions.setSheetExpanded(false));
    }
  }

  function handleStartAdd() {
    if (addMode) dispatch(mapUiActions.setAddMode(false));
    else {
      dispatch(mapUiActions.setAddMode(true));
      dispatch(mapUiActions.setActivePanel(null));
    }
  }

  const sheetOpen = activePanel !== null;
  const userInitial = user?.username?.slice(0, 1).toUpperCase() ?? "";

  const mapCenter = useMemo<[number, number]>(() => {
    const hit = cityCatalog.find((c) => c.id === city);
    if (hit) return [hit.lat, hit.lng];
    const legacy = CITY_COORDS[city as keyof typeof CITY_COORDS];
    return legacy ?? CITY_COORDS.shumikha;
  }, [city, cityCatalog]);

  const mapBounds = useMemo(() => {
    const hit = cityCatalog.find((c) => c.id === city);
    if (hit) return getCityMapBounds(hit);
    const c = CITY_COORDS[city as keyof typeof CITY_COORDS] ?? CITY_COORDS.shumikha;
    return boundsAroundCenter(c[0], c[1]);
  }, [city, cityCatalog]);

  const handleMapClick = useCallback(
    (coords: [number, number]) => {
      dispatch(mapUiActions.setPendingCoords(coords));
      dispatch(mapUiActions.setAddMode(false));
      dispatch(mapUiActions.setActivePanel("new"));
    },
    [dispatch]
  );

  const handleMarkerClick = useCallback(
    (post: PostRow) => {
      dispatch(mapUiActions.setSelectedPost(post));
      dispatch(mapUiActions.setActivePanel("details"));
      dispatch(mapUiActions.setSheetExpanded(false));
      dispatch(mapUiActions.setAddMode(false));
    },
    [dispatch]
  );

  const markerSizePx = MARKER_PRESET_PX[markerPreset];

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <YandexMap
        apiKey={yandexApiKey}
        posts={posts}
        mapCenter={mapCenter}
        mapBounds={mapBounds}
        markerSize={markerSizePx}
        addMode={addMode}
        onMapClick={handleMapClick}
        onMarkerClick={handleMarkerClick}
      />
      <div className="ui-map-vignette" aria-hidden />

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

      {addMode && (
        <div className="ui-add-hint" role="status">
          <Crosshair className="h-4 w-4 animate-pulse" aria-hidden />
          Нажмите на карту чтобы поставить метку
        </div>
      )}

      {sheetOpen && (
        <div
          className="fixed inset-0 z-20"
          style={{
            background: "rgba(23, 19, 31, 0.14)",
            backdropFilter: "blur(2px)",
            transition: "opacity 280ms ease",
          }}
          onClick={() => {
            dispatch(mapUiActions.closeSheet());
          }}
          aria-hidden
        />
      )}

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
        <button
          type="button"
          onClick={() => dispatch(mapUiActions.toggleSheetExpanded())}
          className="w-full pt-3 pb-2.5 flex justify-center cursor-pointer focus-visible:outline-none"
          aria-label={sheetExpanded ? "Свернуть панель" : "Развернуть панель"}
        >
          <span className="ui-sheet-handle" />
        </button>

        <div className="ui-sheet-body overflow-y-auto flex-1" style={{ animation: "section-in 240ms ease-out" }}>
          {activePanel === "new" && (
            <>
              <SheetHeader title="Новая метка" subtitle="Укажите место, тип и отправьте" />
              <AddPostBox
                addMode={addMode}
                pendingCoords={pendingCoords}
                type={newType}
                comment={newComment}
                tags={newTags}
                setType={(v) => dispatch(mapUiActions.setNewType(v))}
                setComment={(v) => dispatch(mapUiActions.setNewComment(v))}
                setTags={(v) => dispatch(mapUiActions.setNewTags(v))}
                onStartAdd={handleStartAdd}
                onSubmit={createMarker}
              />
            </>
          )}

          {activePanel === "settings" && (
            <>
              <SheetHeader title="Настройки карты" />
              <MapSettingsPanel
                cities={cityCatalog}
                city={city}
                onCity={(id) => dispatch(mapUiActions.setCity(id))}
                markerPreset={markerPreset}
                onPreset={(p) => dispatch(mapUiActions.setMarkerPreset(p))}
              />
            </>
          )}

          {activePanel === "profile" && (
            <>
              <SheetHeader title={user ? "Мой профиль" : "Вход / Регистрация"} />
              <AuthBox
                user={user}
                stats={userStats}
                stripeCheckoutEnabled={stripeCheckoutEnabled}
                donateUrl={donateUrl}
                onLogin={(u, p) => auth("login", u, p)}
                onRegister={(u, p) => auth("register", u, p)}
                onLogout={logout}
                onChangePassword={handleChangePassword}
                onSubscribe={handleSubscribe}
                onProfileRefresh={async () => {
                  await dispatch(fetchMe());
                }}
                onNotice={(msg) => dispatch(mapUiActions.setNotice(msg))}
              />
            </>
          )}

          {activePanel === "details" && (
            <>
              <SheetHeader title="Детали метки" />
              <PostDetailsBox post={selectedPost} user={user} onVote={vote} onDelete={deleteCurrentPost} />
            </>
          )}
        </div>
      </div>

      {notice && (
        <div className="ui-toast-float">
          <Toast>{notice}</Toast>
        </div>
      )}

      <nav className="ui-bottom-nav" aria-label="Навигация приложения">
        <button
          type="button"
          onClick={() => dispatch(mapUiActions.closeSheet())}
          className={`ui-nav-btn ${activePanel === null && !addMode ? "ui-nav-btn-active" : ""}`}
          aria-label="Карта"
        >
          <Map className="h-5 w-5" aria-hidden />
          <span>Карта</span>
        </button>

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

        <button
          type="button"
          onClick={() => togglePanel("profile")}
          className={`ui-nav-btn ${activePanel === "profile" ? "ui-nav-btn-active" : ""}`}
          aria-label={user ? "Профиль" : "Войти"}
          aria-pressed={activePanel === "profile"}
        >
          {user ? (
            user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover ring-2 ring-white/90"
                style={{
                  objectPosition: "50% 50%",
                  outline: activePanel === "profile" ? "2px solid rgba(239, 68, 68, 0.3)" : "none",
                  outlineOffset: "2px",
                }}
              />
            ) : (
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
            )
          ) : (
            <UserIcon className="h-5 w-5" aria-hidden />
          )}
          <span>{user ? (user.username.length > 7 ? user.username.slice(0, 6) + "…" : user.username) : "Войти"}</span>
        </button>
      </nav>
    </main>
  );
}

function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 pb-1 pt-0.5">
      <h2
        className="text-[16px] font-bold tracking-normal leading-snug"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h2>
      {subtitle && <p className="ui-soft text-[12px] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function MapSettingsPanel({
  cities,
  city,
  onCity,
  markerPreset,
  onPreset,
}: {
  cities: CityEntry[];
  city: string;
  onCity: (id: string) => void;
  markerPreset: MarkerSizePreset;
  onPreset: (p: MarkerSizePreset) => void;
}) {
  return (
    <div className="ui-section">
      <div className="grid gap-1.5">
        <span className="ui-eyebrow">Город</span>
        <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
          {(cities.length ? cities : [{ id: "shumikha", label: "Шумиха", lat: 55.2255, lng: 63.2982 }]).map((c) => (
            <Chip key={c.id} active={city === c.id} onClick={() => onCity(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="ui-eyebrow">Размер маркеров</span>
        <div
          className="flex flex-wrap items-center gap-2 rounded-[12px] px-3 py-2.5"
          style={{
            background: "rgba(255, 255, 255, 0.62)",
            border: "1px solid var(--color-border)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
          }}
        >
          {(["s", "m", "l"] as const).map((key) => (
            <Chip
              key={key}
              active={markerPreset === key}
              onClick={() => onPreset(key)}
              className="min-w-[52px] justify-center font-semibold"
              aria-label={
                key === "s" ? "Мелкие маркеры" : key === "m" ? "Средние маркеры" : "Крупные маркеры"
              }
            >
              {key.toUpperCase()}
            </Chip>
          ))}
          <span className="ui-mono ml-auto text-[11px] font-medium opacity-75">{MARKER_PRESET_PX[markerPreset]}px</span>
        </div>
      </div>
    </div>
  );
}
