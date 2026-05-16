"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  CreditCard,
  Heart,
  ImageUp,
  KeyRound,
  LogIn,
  LogOut,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AvatarCropSheet } from "@/components/map/AvatarCropSheet";
import type { AuthUser, UserPublicStats } from "@/types/models";
import { formatDate, formatUsername } from "@/lib/format";

type Props = {
  user: AuthUser | null;
  stats: UserPublicStats | null;
  stripeCheckoutEnabled: boolean;
  donateUrl: string;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onSubscribe: () => Promise<void>;
  onProfileRefresh: () => Promise<void>;
  onNotice?: (msg: string) => void;
};

export function AuthBox({
  user,
  stats,
  stripeCheckoutEnabled,
  donateUrl,
  onLogin,
  onRegister,
  onLogout,
  onChangePassword,
  onSubscribe,
  onProfileRefresh,
  onNotice,
}: Props) {
  const avInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avBusy, setAvBusy] = useState(false);
  const [avErr, setAvErr] = useState("");
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [pwdOpen, setPwdOpen] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdErr, setPwdErr] = useState("");
  const [subBusy, setSubBusy] = useState(false);

  async function submit() {
    if (!username || !password) return;
    if (tab === "login") await onLogin(username, password);
    if (tab === "register") await onRegister(username, password);
    setPassword("");
  }

  const subUntil = user?.subscription_until ? new Date(user.subscription_until).getTime() : 0;
  const subActive = subUntil > Date.now();

  async function handlePwd() {
    setPwdErr("");
    if (newPwd.length < 6) {
      setPwdErr("Новый пароль: минимум 6 символов");
      return;
    }
    if (newPwd !== newPwd2) {
      setPwdErr("Пароли не совпадают");
      return;
    }
    setPwdBusy(true);
    try {
      await onChangePassword(curPwd, newPwd);
      setCurPwd("");
      setNewPwd("");
      setNewPwd2("");
      setPwdOpen(false);
    } catch (e) {
      setPwdErr(e instanceof Error ? e.message : "Ошибка смены пароля");
    } finally {
      setPwdBusy(false);
    }
  }

  async function handleSubscribe() {
    setSubBusy(true);
    try {
      await onSubscribe();
    } finally {
      setSubBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setAvErr("");
    setAvBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось загрузить");
      await onProfileRefresh();
      onNotice?.("Аватар обновлён");
    } catch (e) {
      setAvErr(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setAvBusy(false);
    }
  }

  async function removeAvatar() {
    setAvErr("");
    setAvBusy(true);
    try {
      const res = await fetch("/api/auth/avatar", { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось удалить");
      await onProfileRefresh();
      onNotice?.("Аватар убран");
    } catch (e) {
      setAvErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setAvBusy(false);
    }
  }

  if (user) {
    return (
      <>
        {cropFile ? (
          <AvatarCropSheet
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onConfirm={(f) => {
              setCropFile(null);
              void uploadAvatar(f);
            }}
          />
        ) : null}
      <div className="ui-section flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={avBusy}
            onClick={() => avInputRef.current?.click()}
            className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[color:var(--color-border)] text-[15px] font-bold text-white outline-none transition-opacity disabled:opacity-60"
            style={{
              background: user.avatar_url ? "#1a1524" : "linear-gradient(135deg, #21182f, #100b18)",
              boxShadow: "0 14px 26px -16px rgba(23,19,31,0.62)",
            }}
            aria-label="Загрузить или сменить аватар"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "50% 50%" }}
              />
            ) : (
              user.username.slice(0, 1).toUpperCase()
            )}
          </button>
          <input
            ref={avInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setCropFile(f);
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold leading-tight">{formatUsername(user.username)}</p>
            <p className="ui-soft mt-0.5 text-[11px]">
              {user.role === "admin" ? "Администратор" : "Участник сообщества"}
              {stats ? (
                <>
                  {" · "}
                  <span className="font-semibold" style={{ color: "var(--color-brand-deep)" }}>
                    ур. {stats.level}
                  </span>
                </>
              ) : null}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={avBusy}
                onClick={() => avInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-brand-deep)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                <ImageUp className="h-3 w-3 shrink-0" aria-hidden />
                Фото
              </button>
              {user.avatar_url ? (
                <button
                  type="button"
                  disabled={avBusy}
                  onClick={() => void removeAvatar()}
                  className="text-[11px] font-semibold text-[color:var(--color-danger)] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Убрать
                </button>
              ) : null}
            </div>
            {avErr ? (
              <p className="mt-1 text-[11px] font-medium" style={{ color: "var(--color-danger)" }}>
                {avErr}
              </p>
            ) : null}
          </div>
          {user.role === "admin" && (
            <a
              href="/admin"
              className="ui-btn ui-btn-soft !min-h-[32px] !py-1 text-[12px]"
              aria-label="Открыть админ-панель"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              Админ
            </a>
          )}
        </div>

        {stats && (
          <div
            className="grid grid-cols-2 gap-2 rounded-[14px] p-3 text-[12px]"
            style={{
              background: "rgba(255,255,255,0.55)",
              border: "1px solid var(--color-border)",
            }}
          >
            <StatMini icon={<TrendingUp className="h-3.5 w-3.5" />} label="Меток" value={String(stats.posts_created)} />
            <StatMini
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="«Актуально»"
              value={String(stats.relevant_votes_received)}
            />
            <StatMini icon={<Shield className="h-3.5 w-3.5" />} label="Репутация" value={String(stats.reputation)} />
            <StatMini icon={<Sparkles className="h-3.5 w-3.5" />} label="Уровень" value={String(stats.level)} />
          </div>
        )}

        <div
          className="rounded-[14px] px-3 py-2.5 text-[12px]"
          style={{
            background: subActive ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.5)",
            border: `1px solid ${subActive ? "rgba(34,197,94,0.35)" : "var(--color-border)"}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold" style={{ color: "var(--color-ink)" }}>
              Поддержка проекта
            </span>
            {subActive ? (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100">
                активна
              </span>
            ) : (
              <span className="ui-soft text-[11px]">не подключена</span>
            )}
          </div>
          <p className="ui-soft mt-1 text-[11px] leading-snug">
            {subActive
              ? `До ${formatDate(user.subscription_until ?? undefined)}`
              : "Подписка помогает держать карту онлайн. Оформляется через Stripe (как физлицо)."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stripeCheckoutEnabled && (
              <Button
                variant="primary"
                className="!min-h-[36px] flex-1 text-[12px]"
                disabled={subBusy}
                onClick={() => void handleSubscribe()}
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                {subActive ? "Продлить / управление" : "Оформить подписку"}
              </Button>
            )}
            {donateUrl ? (
              <a
                href={donateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-btn ui-btn-soft !min-h-[36px] inline-flex flex-1 items-center justify-center gap-1.5 text-[12px]"
              >
                <Heart className="h-4 w-4" aria-hidden />
                Задонатить
              </a>
            ) : null}
          </div>
          {!stripeCheckoutEnabled && !donateUrl ? (
            <p className="ui-soft mt-2 text-[11px]">Оплата скоро будет доступна.</p>
          ) : null}
        </div>

        <div className="rounded-[14px] border border-[color:var(--color-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setPwdOpen((v) => !v);
              setPwdErr("");
            }}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] font-semibold"
            style={{ background: "rgba(255,255,255,0.45)" }}
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4" aria-hidden />
              Сменить пароль
            </span>
            <span className="ui-soft text-[11px]">{pwdOpen ? "▼" : "▶"}</span>
          </button>
          {pwdOpen && (
            <div className="grid gap-2 border-t border-[color:var(--color-border)] p-3">
              <label className="grid gap-1">
                <span className="ui-eyebrow">Текущий пароль</span>
                <Input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} autoComplete="current-password" />
              </label>
              <label className="grid gap-1">
                <span className="ui-eyebrow">Новый пароль</span>
                <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" />
              </label>
              <label className="grid gap-1">
                <span className="ui-eyebrow">Повтор нового</span>
                <Input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} autoComplete="new-password" />
              </label>
              {pwdErr ? (
                <p className="text-[11px] font-medium" style={{ color: "var(--color-danger)" }}>
                  {pwdErr}
                </p>
              ) : null}
              <Button variant="soft" className="w-full" disabled={pwdBusy} onClick={() => void handlePwd()}>
                Сохранить пароль
              </Button>
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={onLogout} className="w-full">
          <LogOut className="h-4 w-4" aria-hidden />
          Выйти
        </Button>
      </div>
      </>
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

function StatMini({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[color:var(--color-brand-deep)] opacity-80">{icon}</span>
      <div>
        <p className="ui-soft text-[10px] uppercase tracking-wide">{label}</p>
        <p className="font-bold tabular-nums text-[13px]" style={{ color: "var(--color-ink)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
