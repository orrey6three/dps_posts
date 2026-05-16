"use client";

import { useState } from "react";
import { ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Props = { onLogin: (password: string) => Promise<void> };

export function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-[100dvh] w-full px-4 py-12 sm:py-20 flex items-start sm:items-center justify-center">
      <section className="ui-card w-full max-w-[380px] !p-5">
        <header className="flex items-center gap-3 pb-3" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
          <span
            className="grid h-10 w-10 place-items-center rounded-[10px]"
            style={{
              background: "linear-gradient(135deg, var(--color-brand), var(--color-brand-accent))",
              color: "white",
              boxShadow: "0 4px 12px -2px rgba(239, 68, 68, 0.35)"
            }}
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[15px] font-bold leading-tight tracking-normal">DPS45 · Админ</h1>
            <p className="ui-soft text-[11px]">Введите пароль администратора</p>
          </div>
        </header>

        <label className="grid gap-1 pt-3">
          <span className="ui-eyebrow">Пароль</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onLogin(password);
            }}
            placeholder="••••••••"
            autoFocus
            aria-label="Пароль администратора"
          />
        </label>

        <div className="flex flex-col gap-2 pt-1">
          <Button variant="primary" onClick={() => onLogin(password)}>
            <LogIn className="h-4 w-4" aria-hidden />
            Войти
          </Button>
          <a className="ui-btn ui-btn-ghost" href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Назад к карте
          </a>
        </div>
      </section>
    </main>
  );
}
