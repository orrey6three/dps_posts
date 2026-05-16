"use client";

import { Save, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Setting = {
  key: string;
  value: any;
  updated_at: string;
};

type Props = {
  settings: Setting[];
  onSave: (key: string, value: any) => Promise<void>;
};

export function AdminSettings({ settings, onSave }: Props) {
  const markerTtl = settings.find((s) => s.key === "marker_ttl")?.value || {};
  const appConfig = settings.find((s) => s.key === "app_config")?.value || {};

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Время жизни меток (сек)" icon={<SettingsIcon className="h-4 w-4" />}>
        <div className="grid gap-3">
          {Object.entries(markerTtl).map(([type, seconds]) => (
            <label key={type} className="grid gap-1">
              <span className="ui-eyebrow">{type}</span>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={seconds as number}
                  onChange={(e) => {
                    const next = { ...markerTtl, [type]: Number(e.target.value) };
                    onSave("marker_ttl", next);
                  }}
                />
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Общие настройки" icon={<SettingsIcon className="h-4 w-4" />}>
        <div className="grid gap-4">
          <label className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[color:var(--color-surface-2)]">
            <span className="text-[13px] font-medium">Открытая регистрация</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--color-brand-accent)]"
              checked={appConfig.is_registration_open}
              onChange={(e) => {
                onSave("app_config", { ...appConfig, is_registration_open: e.target.checked });
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[color:var(--color-surface-2)]">
            <span className="text-[13px] font-medium">Показывать неактуальные метки</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--color-brand-accent)]"
              checked={appConfig.show_offline_markers}
              onChange={(e) => {
                onSave("app_config", { ...appConfig, show_offline_markers: e.target.checked });
              }}
            />
          </label>
        </div>
      </Card>
    </div>
  );
}
