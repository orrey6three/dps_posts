"use client";

import { useState } from "react";
import { LogIn, LogOut, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
      <div className="ui-section">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #21182f, #100b18)",
              boxShadow: "0 14px 26px -16px rgba(23,19,31,0.62)"
            }}
            aria-hidden
          >
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold leading-tight">{formatUsername(user.username)}</p>
            <p className="ui-soft mt-0.5 text-[11px]">
              {user.role === "admin" ? "Администратор" : "Участник сообщества"}
            </p>
          </div>
          {user.role === "admin" && (
            <a href="/admin" className="ui-btn ui-btn-soft !min-h-[32px] !py-1 text-[12px]" aria-label="Открыть админ-панель">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              Админ
            </a>
          )}
        </div>
        <Button variant="ghost" onClick={onLogout} className="w-full">
          <LogOut className="h-4 w-4" aria-hidden />
          Выйти
        </Button>
      </div>
    );
  }

  return (
    <div className="ui-section">
      <div role="tablist" aria-label="Тип авторизации" className="ui-segment grid-cols-2">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "login"}
          onClick={() => setTab("login")}
          className={`ui-segment-btn ${tab === "login" ? "ui-segment-btn-active" : ""}`}
        >
          <LogIn className="h-3.5 w-3.5" aria-hidden />
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "register"}
          onClick={() => setTab("register")}
          className={`ui-segment-btn ${tab === "register" ? "ui-segment-btn-active" : ""}`}
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Регистрация
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="grid gap-1">
          <span className="ui-eyebrow">Имя</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="example"
            autoComplete="username"
            aria-label="Имя пользователя"
          />
        </label>
        <label className="grid gap-1">
          <span className="ui-eyebrow">Пароль</span>
          <Input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="••••••••"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            aria-label="Пароль"
          />
        </label>
      </div>

      <Button variant="primary" onClick={submit} className="w-full">
        {tab === "login" ? <LogIn className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
        {tab === "login" ? "Войти" : "Создать аккаунт"}
      </Button>
    </div>
  );
}
