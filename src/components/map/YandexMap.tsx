"use client";

import { useEffect, useRef } from "react";
import { CITY_COORDS, CLUSTER_MIN_MARKERS, MAP_AREA_LIMITS } from "@/lib/constants";
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

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  const clusterRef = useRef<any>(null);
  const viewportCleanupRef = useRef<(() => void) | null>(null);
  const addModeRef = useRef(addMode);
  const onMapClickRef = useRef(onMapClick);
  const onMarkerClickRef = useRef(onMarkerClick);

  useEffect(() => {
    addModeRef.current = addMode;
    onMapClickRef.current = onMapClick;
    onMarkerClickRef.current = onMarkerClick;
  }, [addMode, onMapClick, onMarkerClick]);

  useEffect(() => {
    let mounted = true;

    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (!mounted || !hostRef.current || mapRef.current) return;
        const mapType = theme === "dark" ? "yandex#hybrid" : "yandex#map";
        mapRef.current = new ymaps.Map(
          hostRef.current,
          {
            center: CITY_COORDS[city] ?? CITY_COORDS.shumikha,
            zoom: 12,
            type: mapType,
            controls: ["zoomControl", "geolocationControl"]
          },
          {
            suppressMapOpenBlock: true,
            restrictMapArea: MAP_AREA_LIMITS,
            minZoom: 10,
            maxZoom: 18
          }
        );
        mapRef.current.events.add("click", (event: any) => {
          if (!addModeRef.current) return;
          onMapClickRef.current(event.get("coords"));
        });

        const fitViewport = () => {
          try {
            mapRef.current?.container?.fitToViewport();
          } catch {
            /* noop */
          }
        };
        const scheduleFit = () => requestAnimationFrame(fitViewport);
        window.addEventListener("resize", scheduleFit);
        const onVis = () => {
          if (!document.hidden) fitViewport();
        };
        document.addEventListener("visibilitychange", onVis);

        viewportCleanupRef.current = () => {
          window.removeEventListener("resize", scheduleFit);
          document.removeEventListener("visibilitychange", onVis);
        };
      })
      .catch(console.error);
    return () => {
      mounted = false;
      viewportCleanupRef.current?.();
      viewportCleanupRef.current = null;
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

    objectsRef.current.forEach((obj) => {
      try {
        map.geoObjects.remove(obj);
      } catch {
        /* noop */
      }
    });
    objectsRef.current = [];
    clusterRef.current = null;

    const placemarks: any[] = [];
    const reduced = prefersReducedMotion();

    posts.forEach((post) => {
      if (post.type === "Патруль" && post.street_geometry?.length) {
        const line = new window.ymaps.Polyline(post.street_geometry, {}, { strokeColor: "#ef4444", strokeWidth: 6 });
        map.geoObjects.add(line);
        objectsRef.current.push(line);
      }
      const relevantTime = post.last_relevant ?? post.created_at;
      const ttl = post.type === "Патруль" ? 5 * 60 * 1000 : 60 * 60 * 1000;
      if (isExpired(relevantTime, ttl)) return;

      const sizeStr = Math.max(markerSize, 36);
      const htmlLayout = buildMarkerHTML(post.type, sizeStr, !reduced);
      const layout = window.ymaps.templateLayoutFactory.createClass(htmlLayout);
      const placemark = new window.ymaps.Placemark(
        [post.latitude, post.longitude],
        { hintContent: post.type, balloonContent: post.comment ?? "" },
        {
          iconLayout: layout,
          hideIconOnBalloonOpen: false,
          iconShape: {
            type: "Rectangle",
            coordinates: [
              [-sizeStr / 2, -sizeStr / 2],
              [sizeStr / 2, sizeStr / 2]
            ]
          },
          iconOffset: [-sizeStr / 2, -sizeStr / 2]
        }
      );
      placemark.events.add("click", (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        onMarkerClickRef.current(post);
      });
      placemarks.push(placemark);
    });

    const Clusterer = window.ymaps.Clusterer;
    if (Clusterer && placemarks.length >= CLUSTER_MIN_MARKERS) {
      try {
        clusterRef.current = new Clusterer({
          preset: "islands#invertedBlueClusterIcons",
          groupByCoordinates: false,
          gridSize: 64,
          clusterDisableClickZoom: false
        });
        clusterRef.current.add(placemarks);
        map.geoObjects.add(clusterRef.current);
        objectsRef.current.push(clusterRef.current);
      } catch {
        placemarks.forEach((pm) => {
          map.geoObjects.add(pm);
          objectsRef.current.push(pm);
        });
      }
    } else {
      placemarks.forEach((pm) => {
        map.geoObjects.add(pm);
        objectsRef.current.push(pm);
      });
    }
  }, [posts, markerSize]);

  return <div ref={hostRef} className={`map-host ${addMode ? "map-host--add" : ""}`} />;
}

function buildMarkerHTML(type: string, markerSize: number, showPulse: boolean) {
  let themeClass = "marker-default";
  let svg = "";

  if (type === "Патруль") {
    themeClass = "marker-patrol";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 16h-4m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0m-7 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0"/><path d="M12 4v3m-3-3h6"/></svg>`;
  } else if (type === "Нужна помощь") {
    themeClass = "marker-help";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>`;
  } else if (type === "Чисто") {
    themeClass = "marker-clear";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === "Вопрос") {
    themeClass = "marker-question";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    themeClass = "marker-default";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
  }

  const pulse = showPulse ? `<div class="marker-pulse"></div>` : "";

  return `
    <div class="custom-marker ${themeClass}" style="width: ${markerSize}px; height: ${markerSize}px;">
      ${pulse}
      ${svg}
    </div>
  `;
}
