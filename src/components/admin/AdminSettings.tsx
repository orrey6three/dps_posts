"use client";

import { useEffect, useState } from "react";
import { MapPin, Save, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { AdminCityMapPicker } from "@/components/admin/AdminCityMapPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DEFAULT_CITY_CATALOG, normalizeCityCatalog, suggestCityId, type CityEntry } from "@/lib/cities";

type Setting = {
  key: string;
  value: any;
  updated_at: string;
};

type Props = {
  settings: Setting[];
  yandexApiKey: string;
  onSave: (key: string, value: any) => Promise<void>;
};

function CityCatalogCard({
  rawValue,
  yandexApiKey,
  onSave,
}: {
  rawValue: unknown;
  yandexApiKey: string;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [cities, setCities] = useState<CityEntry[]>(() =>
    normalizeCityCatalog(rawValue ?? DEFAULT_CITY_CATALOG)
  );
  const [label, setLabel] = useState("");
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(normalizeCityCatalog(rawValue ?? DEFAULT_CITY_CATALOG), null, 2)
  );
  const [jsonDirty, setJsonDirty] = useState(false);
  const [jsonErr, setJsonErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = normalizeCityCatalog(rawValue ?? DEFAULT_CITY_CATALOG);
    setCities(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonDirty(false);
    setJsonErr("");
    setPicked(null);
    setLabel("");
  }, [rawValue]);

  useEffect(() => {
    if (!jsonDirty) setJsonText(JSON.stringify(cities, null, 2));
  }, [cities, jsonDirty]);

  async function saveCatalog(next: CityEntry[]) {
    setBusy(true);
    try {
      await onSave("city_catalog", next);
    } finally {
      setBusy(false);
    }
  }

  async function saveFromList() {
    setJsonErr("");
    await saveCatalog(cities);
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const next = normalizeCityCatalog(parsed);
      setCities(next);
      setJsonDirty(false);
      setJsonErr("");
    } catch {
      setJsonErr("Невалидный JSON");
    }
  }

  function addCityFromMap() {
    if (!picked || !label.trim()) return;
    const lat = picked[0];
    const lng = picked[1];
    const ids = new Set(cities.map((c) => c.id));
    const baseId = suggestCityId(label, lat, lng);
    let id = baseId;
    let n = 0;
    while (ids.has(id)) {
      n += 1;
      id = `${baseId}_${n}`;
    }
    setJsonDirty(false);
    setCities((prev) => [...prev, { id, label: label.trim(), lat, lng }]);
    setLabel("");
  }

  function removeCity(id: string) {
    setJsonDirty(false);
    setCities((prev) => prev.filter((c) => c.id !== id));
  }

  const mapCenter: [number, number] = cities.length
    ? [
        cities.reduce((s, c) => s + c.lat, 0) / cities.length,
        cities.reduce((s, c) => s + c.lng, 0) / cities.length,
      ]
    : [55.75, 37.62];

  return (
    <Card title="Города карты" icon={<MapPin className="h-4 w-4" />} className="md:col-span-2">
      <p className="mb-3 text-[12px] leading-snug opacity-80">
        Клик по карте задаёт центр города. Введите название и нажмите «Добавить». Поиск — контрол Яндекса.
        Поле <span className="font-mono">map_bounds</span> — только через JSON ниже.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-3">
          <AdminCityMapPicker apiKey={yandexApiKey} initialCenter={mapCenter} initialZoom={5} onPick={setPicked} />
          {picked ? (
            <p className="font-mono text-[12px] opacity-90">
              Точка: {picked[0].toFixed(5)}, {picked[1].toFixed(5)}
            </p>
          ) : (
            <p className="text-[12px] opacity-70">Кликните по карте, чтобы выбрать координаты.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-1">
              <span className="ui-eyebrow">Название города</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Например, Омск" />
            </label>
            <Button variant="primary" type="button" disabled={!picked || !label.trim()} onClick={addCityFromMap}>
              Добавить в список
            </Button>
          </div>
        </div>

        <div className="flex min-h-[200px] flex-col rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
          <div className="border-b border-[color:var(--color-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Каталог ({cities.length})
          </div>
          <ul className="max-h-[280px] flex-1 divide-y divide-[color:var(--color-hairline)] overflow-y-auto">
            {cities.map((c) => (
              <li key={c.id} className="flex items-start gap-2 px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="font-semibold">{c.label}</span>
                  <span className="mt-0.5 block font-mono text-[11px] opacity-70">
                    {c.id} · {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1.5 opacity-70 hover:bg-[color:var(--color-danger)]/15 hover:opacity-100"
                  aria-label={`Удалить ${c.label}`}
                  onClick={() => removeCity(c.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Button variant="primary" className="mt-4" type="button" disabled={busy} onClick={() => void saveFromList()}>
        <Save className="h-4 w-4" aria-hidden />
        Сохранить каталог
      </Button>

      <details className="mt-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3">
        <summary className="cursor-pointer text-[13px] font-semibold">JSON — границы карты и ручная правка</summary>
        <p className="mt-2 text-[11px] leading-snug opacity-80">
          Массив: <span className="font-mono">id</span>, <span className="font-mono">label</span>,{" "}
          <span className="font-mono">lat</span>, <span className="font-mono">lng</span>; опционально{" "}
          <span className="font-mono">map_bounds</span>. После правки — «Применить JSON», затем «Сохранить каталог».
        </p>
        <textarea
          className="mt-2 min-h-[180px] w-full resize-y rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-[12px] leading-relaxed"
          value={jsonText}
          spellCheck={false}
          onChange={(e) => {
            setJsonText(e.target.value);
            setJsonDirty(true);
          }}
          aria-label="Каталог городов JSON"
        />
        {jsonErr ? (
          <p className="mt-2 text-[12px] font-medium" style={{ color: "var(--color-danger)" }}>
            {jsonErr}
          </p>
        ) : null}
        <Button variant="ghost" className="mt-2" type="button" onClick={applyJson}>
          Применить JSON к списку
        </Button>
      </details>
    </Card>
  );
}

export function AdminSettings({ settings, yandexApiKey, onSave }: Props) {
  const markerTtl = settings.find((s) => s.key === "marker_ttl")?.value || {};
  const appConfig = settings.find((s) => s.key === "app_config")?.value || {};
  const cityCatalogRaw = settings.find((s) => s.key === "city_catalog")?.value;

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
          <label className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface-2)] p-2">
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
          <label className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface-2)] p-2">
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

      <CityCatalogCard rawValue={cityCatalogRaw} yandexApiKey={yandexApiKey} onSave={onSave} />
    </div>
  );
}
