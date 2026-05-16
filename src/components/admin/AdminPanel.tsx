"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, Map, MapPin, Settings as SettingsIcon, ThumbsUp, Trash2, Users } from "lucide-react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminPosts } from "@/components/admin/AdminPosts";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { createRealtimeSupabase } from "@/lib/supabase";

type Props = { supabaseUrl: string; supabaseAnonKey: string; yandexApiKey: string };

export function AdminPanel({ supabaseUrl, supabaseAnonKey, yandexApiKey }: Props) {
  const sb = useMemo(
    () => createRealtimeSupabase(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<"posts" | "users" | "settings">("posts");
  const [stats, setStats] = useState({ total_posts: 0, total_users: 0, total_votes: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => void verify(), []);

  useEffect(() => {
    if (!authorized || !sb) return;

    const postsChannel = sb
      .channel("admin-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        void loadPosts();
        void loadStats();
      })
      .subscribe();

    const usersChannel = sb
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        void loadUsers();
        void loadStats();
      })
      .subscribe();

    const settingsChannel = sb
      .channel("admin-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
        void loadSettings();
      })
      .subscribe();

    return () => {
      sb.removeChannel(postsChannel);
      sb.removeChannel(usersChannel);
      sb.removeChannel(settingsChannel);
    };
  }, [authorized, sb]);

  async function verify() {
    const res = await fetch("/admin/api/verify", { credentials: "include" });
    if (!res.ok) return setAuthorized(false);
    setAuthorized(true);
    await Promise.all([loadStats(), loadPosts(), loadUsers(), loadSettings()]);
  }

  async function loadStats() {
    const res = await fetch("/admin/api/stats", { credentials: "include" });
    if (res.ok) setStats(await res.json());
  }

  async function loadPosts() {
    const res = await fetch("/admin/api/posts", { credentials: "include" });
    if (res.ok) setPosts((await res.json()).posts ?? []);
  }

  async function loadUsers() {
    const res = await fetch("/admin/api/users", { credentials: "include" });
    if (res.ok) setUsers((await res.json()).users ?? []);
  }

  async function loadSettings() {
    const res = await fetch("/admin/api/settings", { credentials: "include" });
    if (res.ok) setSettings((await res.json()).settings ?? []);
  }

  async function updateSetting(key: string, value: any) {
    const res = await fetch("/admin/api/settings", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    if (!res.ok) return setNotice("Ошибка обновления настроек");
    await loadSettings();
  }

  async function login(password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password })
    });
    if (!res.ok) return setNotice("Ошибка входа");
    await verify();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuthorized(false);
  }

  async function savePost(draft: any) {
    const method = draft.id ? "PUT" : "POST";
    const endpoint = draft.id ? `/admin/api/posts/${draft.id}` : "/admin/api/posts";
    const res = await fetch(endpoint, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.type,
        type: draft.type,
        address: draft.address,
        latitude: Number(draft.latitude),
        longitude: Number(draft.longitude),
        comment: draft.comment
      })
    });
    if (!res.ok) return setNotice("Ошибка сохранения");
    setNotice("Сохранено");
    await Promise.all([loadPosts(), loadStats()]);
  }

  async function removePost(id: string) {
    await fetch(`/admin/api/posts/${id}`, { method: "DELETE", credentials: "include" });
    await Promise.all([loadPosts(), loadStats()]);
  }

  async function clearVotesForPost(id: string) {
    const res = await fetch(`/admin/api/posts/${id}/votes`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return setNotice("Не удалось очистить голоса");
    setNotice("Голоса по метке удалены");
    await Promise.all([loadPosts(), loadStats()]);
  }

  async function clearAllVotes() {
    if (!confirm("Удалить ВСЕ голоса по всем меткам? Это необратимо.")) return;
    const res = await fetch("/admin/api/votes", { method: "DELETE", credentials: "include" });
    if (!res.ok) return setNotice("Не удалось очистить голоса");
    setNotice("Все голоса удалены");
    await Promise.all([loadPosts(), loadStats()]);
  }

  async function removeUser(id: string) {
    if (!confirm("Удалить пользователя навсегда?")) return;
    await fetch(`/admin/api/users/${id}`, { method: "DELETE", credentials: "include" });
    await Promise.all([loadUsers(), loadStats()]);
  }

  async function toggleUserBan(id: string, isBanned: boolean) {
    const res = await fetch(`/admin/api/users/${id}/shadowban`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShadowbanned: isBanned })
    });
    if (!res.ok) return setNotice("Не удалось изменить статус бана");
    setNotice(isBanned ? "Пользователь заблокирован" : "Пользователь разблокирован");
    await loadUsers();
  }

  if (!authorized) return <AdminLogin onLogin={login} />;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-4 sm:px-6 sm:py-6">
      {/* Header */}
      <header className="ui-card !flex-row !items-center !justify-between flex-wrap gap-3">
        <Brand subtitle="Админ-панель" online />
        <div className="flex flex-wrap items-center gap-2">
          <StatPill icon={<MapPin className="h-3.5 w-3.5" />} label="Метки" value={stats.total_posts} />
          <StatPill icon={<Users className="h-3.5 w-3.5" />} label="Юзеры" value={stats.total_users} />
          <StatPill icon={<ThumbsUp className="h-3.5 w-3.5" />} label="Голоса" value={stats.total_votes} />
          <div className="h-6 w-px bg-[color:var(--color-hairline)] mx-1 hidden sm:block" />
          <a href="/" className="ui-btn ui-btn-ghost !min-h-[38px] !py-1.5">
            <Map className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">На карту</span>
          </a>
          <Button variant="ghost" onClick={logout} aria-label="Выйти из админ-панели" className="!min-h-[38px] !py-1.5">
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Выйти</span>
          </Button>
        </div>
      </header>

      {/* Tabs + global action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Разделы админ-панели" className="ui-segment grid-cols-2 sm:w-auto sm:inline-grid sm:grid-flow-col">
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")} icon={<MapPin className="h-4 w-4" aria-hidden />}>
            Метки
          </TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={<Users className="h-4 w-4" aria-hidden />}>
            Пользователи
          </TabButton>
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon className="h-4 w-4" aria-hidden />}>
            Настройки
          </TabButton>
        </div>
        <Button variant="warning" onClick={() => void clearAllVotes()}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Очистить все голоса
        </Button>
      </div>

      {tab === "posts" && (
        <AdminPosts posts={posts} onSave={savePost} onDelete={removePost} onClearVotes={clearVotesForPost} />
      )}
      {tab === "users" && (
        <AdminUsers users={users} onDelete={removeUser} onToggleBan={toggleUserBan} />
      )}
      {tab === "settings" && (
        <AdminSettings settings={settings} yandexApiKey={yandexApiKey} onSave={updateSetting} />
      )}
      {notice && <Toast>{notice}</Toast>}
    </main>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <span className="ui-stat">
      <span aria-hidden style={{ color: "var(--color-brand-accent)" }}>
        {icon}
      </span>
      <span className="ui-soft hidden sm:inline">{label}:</span>
      <strong>{value}</strong>
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`ui-segment-btn ${active ? "ui-segment-btn-active" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}
