"use client";

import { useState } from "react";
import type { AuthUser } from "@/types/models";
import { formatUsername } from "@/lib/format";

type Props = {
  user: AuthUser | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
};

export function AuthBox({ user, onLogin, onRegister, onLogout }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    if (!username || !password) return;
    if (tab === "login") await onLogin(username, password);
    if (tab === "register") await onRegister(username, password);
    setPassword("");
  }

  if (user) {
    return (
      <div className="card">
        <h3>Профиль</h3>
        <p>{formatUsername(user.username)}</p>
        <p className="muted">{user.role === "admin" ? "Администратор" : "Участник"}</p>
        <div className="row">
          {user.role === "admin" && (
            <a className="button button-soft" href="/admin">
              Админ-панель
            </a>
          )}
          <button className="button button-danger" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Авторизация</h3>
      <div className="row">
        <button className={`button ${tab === "login" ? "button-primary" : "button-soft"}`} onClick={() => setTab("login")}>
          Вход
        </button>
        <button
          className={`button ${tab === "register" ? "button-primary" : "button-soft"}`}
          onClick={() => setTab("register")}
        >
          Регистрация
        </button>
      </div>
      <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Имя" />
      <input
        className="input"
        value={password}
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
      />
      <button className="button button-primary" onClick={submit}>
        {tab === "login" ? "Войти" : "Создать аккаунт"}
      </button>
    </div>
  );
}
