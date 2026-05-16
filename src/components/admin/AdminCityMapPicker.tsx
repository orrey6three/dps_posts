"use client";

import { useEffect, useRef } from "react";
import { loadYandexMaps } from "@/lib/yandex";

type Props = {
  apiKey: string;
  /** Центр только при первом монтировании карты (не обновляется при смене пропа). */
  initialCenter: [number, number];
  initialZoom?: number;
  onPick: (coords: [number, number]) => void;
};

export function AdminCityMapPicker({ apiKey, initialCenter, initialZoom = 4.5, onPick }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const frozenInit = useRef<{ center: [number, number]; zoom: number } | null>(null);
  if (!frozenInit.current) frozenInit.current = { center: initialCenter, zoom: initialZoom };

  useEffect(() => {
    if (!apiKey.trim()) return;
    let mounted = true;
    const { center, zoom } = frozenInit.current!;

    loadYandexMaps(apiKey).then((ymaps: any) => {
      if (!mounted || !hostRef.current || mapRef.current || !ymaps) return;

      const map = new ymaps.Map(
        hostRef.current,
        {
          center,
          zoom,
          type: "yandex#map",
          controls: ["zoomControl", "fullscreenControl", "searchControl"],
        },
        {
          suppressMapOpenBlock: true,
          minZoom: 3,
          maxZoom: 18,
        }
      );
      mapRef.current = map;

      map.events.add("click", (e: any) => {
        const coords = e.get("coords") as [number, number];
        onPickRef.current(coords);
        if (!placemarkRef.current) {
          placemarkRef.current = new ymaps.Placemark(coords, {}, { preset: "islands#redDotIcon" });
          map.geoObjects.add(placemarkRef.current);
        } else {
          placemarkRef.current.geometry.setCoordinates(coords);
        }
      });
    });

    return () => {
      mounted = false;
      placemarkRef.current = null;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [apiKey]);

  if (!apiKey.trim()) {
    return (
      <div
        className="flex h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 text-center text-[13px] opacity-80"
        role="note"
      >
        Задайте в окружении{" "}
        <span className="mx-1 font-mono text-[11px]">NEXT_PUBLIC_YANDEX_MAPS_API_KEY</span>, чтобы карта работала в админке.
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="h-[260px] w-full overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[#dfe6ed]"
      aria-label="Карта: клик по точке задаёт координаты города"
    />
  );
}
