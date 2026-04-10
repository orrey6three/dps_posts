"use client";

import { useState } from "react";

type Props = { onLogin: (password: string) => Promise<void> };

export function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState("");

  return (
    <section className="admin-login">
      <h1>DPS45 Admin</h1>
      <p>Введите пароль администратора</p>
      <input
        className="input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
      />
      <button className="button button-primary" onClick={() => onLogin(password)}>
        Войти
      </button>
      <a className="button button-soft" href="/">
        Назад к карте
      </a>
    </section>
  );
}
