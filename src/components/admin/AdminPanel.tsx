"use client";

import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminPosts } from "@/components/admin/AdminPosts";
import { AdminUsers } from "@/components/admin/AdminUsers";

export function AdminPanel() {
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<"posts" | "users">("posts");
  const [stats, setStats] = useState({ total_posts: 0, total_users: 0, total_votes: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => void verify(), []);

  async function verify() {
    const res = await fetch("/admin/api/verify", { credentials: "include" });
    if (!res.ok) return setAuthorized(false);
    setAuthorized(true);
    await Promise.all([loadStats(), loadPosts(), loadUsers()]);
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

  async function removeUser(id: string) {
    await fetch(`/admin/api/users/${id}`, { method: "DELETE", credentials: "include" });
    await Promise.all([loadUsers(), loadStats()]);
  }

  if (!authorized) return <AdminLogin onLogin={login} />;

  return (
    <main className="admin-shell">
      <header className="card row">
        <strong>DPS45 Админ</strong>
        <span className="muted">Метки: {stats.total_posts}</span>
        <span className="muted">Пользователи: {stats.total_users}</span>
        <span className="muted">Голоса: {stats.total_votes}</span>
        <button className="button button-danger" onClick={logout}>
          Выйти
        </button>
      </header>
      <div className="row">
        <button className={`button ${tab === "posts" ? "button-primary" : "button-soft"}`} onClick={() => setTab("posts")}>
          Метки
        </button>
        <button className={`button ${tab === "users" ? "button-primary" : "button-soft"}`} onClick={() => setTab("users")}>
          Пользователи
        </button>
      </div>
      {tab === "posts" ? (
        <AdminPosts posts={posts} onSave={savePost} onDelete={removePost} />
      ) : (
        <AdminUsers users={users} onDelete={removeUser} />
      )}
      {notice && <div className="notice">{notice}</div>}
    </main>
  );
}
