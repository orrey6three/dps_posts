"use client";

import { ShieldCheck, Trash2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type User = {
  id: string;
  username: string;
  role: string;
  post_count: number;
  created_at: string;
  last_ip?: string;
  is_shadowbanned?: boolean;
};

type Props = {
  users: User[];
  onDelete: (id: string) => Promise<void>;
  onToggleBan: (id: string, isBanned: boolean) => Promise<void>;
};

function AdminBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: "var(--color-warning-tint)", color: "var(--color-warning)" }}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      admin
    </span>
  );
}

export function AdminUsers({ users, onDelete, onToggleBan }: Props) {
  return (
    <Card title="Пользователи" icon={<UsersIcon className="h-4 w-4 text-[color:var(--color-brand-accent)]" aria-hidden />}>
      {/* Desktop: таблица */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr
              className="text-left ui-eyebrow"
              style={{ borderBottom: "1px solid var(--color-hairline)" }}
            >
              <th className="py-2 pr-3 font-semibold">Пользователь</th>
              <th className="py-2 pr-3 font-semibold">IP</th>
              <th className="py-2 pr-3 font-semibold">Роль</th>
              <th className="py-2 pr-3 font-semibold">Метки</th>
              <th className="py-2 pr-3 font-semibold">Дата</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={`transition-colors hover:bg-[color:var(--color-canvas-2)] ${user.is_shadowbanned ? "opacity-60 grayscale-[0.5]" : ""}`}
                style={{ borderBottom: "1px solid var(--color-hairline)" }}
              >
                <td className="py-2.5 pr-3 font-medium">
                  {user.username}
                  {user.is_shadowbanned && <span className="ml-2 text-[10px] text-red-600 font-bold uppercase">Banned</span>}
                </td>
                <td className="py-2.5 pr-3 ui-mono ui-soft text-[11px]">{user.last_ip || "—"}</td>
                <td className="py-2.5 pr-3">
                  {user.role === "admin" ? <AdminBadge /> : <span className="ui-muted">{user.role}</span>}
                </td>
                <td className="py-2.5 pr-3 ui-mono ui-muted">{user.post_count}</td>
                <td className="py-2.5 pr-3 ui-muted ui-mono text-[12px]">
                  {new Date(user.created_at).toLocaleDateString("ru-RU")}
                </td>
                <td className="py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.role !== "admin" && (
                      <>
                        <Button
                          variant={user.is_shadowbanned ? "warning" : "ghost"}
                          onClick={() => onToggleBan(user.id, !user.is_shadowbanned)}
                          className="!min-h-[32px] !py-1"
                        >
                          {user.is_shadowbanned ? "Разбанить" : "Забанить"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => onDelete(user.id)}
                          className="!min-h-[32px] !py-1"
                          aria-label={`Удалить ${user.username}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: карточный список */}
      <ul className="flex flex-col divide-y md:hidden" style={{ borderColor: "var(--color-hairline)" }}>
        {users.map((user) => (
          <li key={user.id} className={`flex flex-col gap-2 py-3 first:pt-0 last:pb-0 ${user.is_shadowbanned ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.username}</span>
                {user.is_shadowbanned && <span className="text-[10px] text-red-600 font-bold uppercase">Banned</span>}
              </div>
              {user.role === "admin" ? <AdminBadge /> : <span className="ui-soft text-[12px]">{user.role}</span>}
            </div>
            <div className="flex items-center justify-between text-[12px] ui-muted">
              <span className="ui-mono text-[11px]">{user.last_ip || "no ip"}</span>
              <span className="ui-mono">{new Date(user.created_at).toLocaleDateString("ru-RU")}</span>
            </div>
            {user.role !== "admin" && (
              <div className="flex items-center gap-2">
                <Button
                  variant={user.is_shadowbanned ? "warning" : "ghost"}
                  onClick={() => onToggleBan(user.id, !user.is_shadowbanned)}
                  className="flex-1"
                >
                  {user.is_shadowbanned ? "Разбанить" : "Забанить"}
                </Button>
                <Button variant="danger" onClick={() => onDelete(user.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
