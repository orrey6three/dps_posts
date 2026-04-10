"use client";

import { useEffect, useRef } from "react";
import { CITY_COORDS } from "@/lib/constants";
import { isExpired } from "@/lib/format";
import { loadYandexMaps } from "@/lib/yandex";
import type { PostRow } from "@/types/models";

type Props = {
  apiKey: string;
  posts: PostRow[];
  city: string;
  theme: "light" | "dark";
  markerSize: number;
  addMode: boolean;
  onMapClick: (coords: [number, number]) => void;
  onMarkerClick: (post: PostRow) => void;
};

export function YandexMap({
  apiKey,
  posts,
  city,
  theme,
  markerSize,
  addMode,
  onMapClick,
  onMarkerClick
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const objectsRef = useRef<any[]>([]);
  const addModeRef = useRef(addMode);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    addModeRef.current = addMode;
    onMapClickRef.current = onMapClick;
  }, [addMode, onMapClick]);

  useEffect(() => {
    let mounted = true;
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (!mounted || !hostRef.current || mapRef.current) return;
        const mapType = theme === "dark" ? "yandex#hybrid" : "yandex#map";
        mapRef.current = new ymaps.Map(hostRef.current, {
          center: CITY_COORDS[city] ?? CITY_COORDS.shumikha,
          zoom: 12,
          type: mapType,
          controls: ["zoomControl", "geolocationControl"]
        });
        mapRef.current.events.add("click", (event: any) => {
          if (!addModeRef.current) return;
          onMapClickRef.current(event.get("coords"));
        });
      })
      .catch(console.error);
    return () => {
      mounted = false;
      if (mapRef.current) mapRef.current.destroy();
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(CITY_COORDS[city] ?? CITY_COORDS.shumikha, 13, { duration: 500 });
  }, [city]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setType(theme === "dark" ? "yandex#hybrid" : "yandex#map");
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.ymaps) return;

    objectsRef.current.forEach((obj) => map.geoObjects.remove(obj));
    objectsRef.current = [];

    posts.forEach((post) => {
      if (post.type === "Патруль" && post.street_geometry?.length) {
        const line = new window.ymaps.Polyline(post.street_geometry, {}, { strokeColor: "#ef4444", strokeWidth: 6 });
        map.geoObjects.add(line);
        objectsRef.current.push(line);
      }
      const relevantTime = post.last_relevant ?? post.created_at;
      const ttl = post.type === "Патруль" ? 5 * 60 * 1000 : 60 * 60 * 1000;
      if (isExpired(relevantTime, ttl)) return;

      const icon = buildIcon(post.type, markerSize);
      const layout = window.ymaps.templateLayoutFactory.createClass(
        `<div style="font-size:${markerSize}px;line-height:${markerSize}px">${icon}</div>`
      );
      const placemark = new window.ymaps.Placemark(
        [post.latitude, post.longitude],
        { hintContent: post.type, balloonContent: post.comment ?? "" },
        {
          iconLayout: layout,
          hideIconOnBalloonOpen: false,
          iconShape: {
            type: "Rectangle",
            coordinates: [
              [-markerSize / 2, -markerSize / 2],
              [markerSize / 2, markerSize / 2]
            ]
          }
        }
      );
      placemark.events.add("click", (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        onMarkerClick(post);
      });
      map.geoObjects.add(placemark);
      objectsRef.current.push(placemark);
    });
  }, [posts, markerSize, onMarkerClick]);

  return <div ref={hostRef} className={`map-host ${addMode ? "map-host--add" : ""}`} />;
}

function buildIcon(type: string, markerSize: number) {
  if (type === "Нужна помощь") return "🆘";
  if (type === "Чисто") return "✅";
  if (type === "Вопрос") return "⚠️";
  if (type === "Патруль") return "🚓";
  if (markerSize >= 34) return "🚔";
  return "📍";
}
