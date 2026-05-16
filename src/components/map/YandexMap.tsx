"use client";

import { memo, useEffect, useRef } from "react";
import type { MapBounds } from "@/lib/cities";
import { CLUSTER_MIN_MARKERS } from "@/lib/constants";
import { isExpired } from "@/lib/format";
import { loadYandexMaps } from "@/lib/yandex";
import type { PostRow } from "@/types/models";

type Props = {
  apiKey: string;
  posts: PostRow[];
  mapCenter: [number, number];
  /** Свои границы города → ограничение тайлов (restrictMapArea). */
  mapBounds: MapBounds;
  markerSize: number;
  addMode: boolean;
  onMapClick: (coords: [number, number]) => void;
  onMarkerClick: (post: PostRow) => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const YandexMap = memo(function YandexMap({
  apiKey,
  posts,
  mapCenter,
  mapBounds,
  markerSize,
  addMode,
  onMapClick,
  onMarkerClick
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapBoundsRef = useRef(mapBounds);
  mapBoundsRef.current = mapBounds;
  const placemarksRef = useRef<Map<string, { pm: any; sig: string; line: any | null }>>(new Map());
  const clusterRef = useRef<any>(null);
  const layoutCacheRef = useRef<Map<string, any>>(new Map());
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
        mapRef.current = new ymaps.Map(
          hostRef.current,
          {
            center: mapCenter,
            zoom: 12,
            type: "yandex#map",
            controls: ["zoomControl", "geolocationControl"]
          },
          {
            suppressMapOpenBlock: true,
            restrictMapArea: mapBoundsRef.current,
            minZoom: 10,
            maxZoom: 18,
            showHintOnHover: false
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
      placemarksRef.current.clear();
      clusterRef.current = null;
      layoutCacheRef.current.clear();
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.options?.set) return;
    try {
      map.options.set({ restrictMapArea: mapBounds });
    } catch {
      /* noop — крайне старые сборки API */
    }
  }, [mapBounds]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(mapCenter, 13, { duration: 500 });
  }, [mapCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.ymaps) return;

    const reduced = prefersReducedMotion();
    const headSize = markerSize;
    const spikeHW  = Math.round(headSize * 0.26);
    const spikeH   = Math.round(headSize * 0.52);
    const totalH   = headSize + spikeH;

    const getLayout = (type: string, expired: boolean, pulse: boolean) => {
      const key = `${type}|${headSize}|${expired ? 1 : 0}|${pulse ? 1 : 0}`;
      const cached = layoutCacheRef.current.get(key);
      if (cached) return cached;
      const html = buildMarkerHTML(type, headSize, spikeHW, spikeH, pulse, expired);
      const cls = window.ymaps.templateLayoutFactory.createClass(html);
      layoutCacheRef.current.set(key, cls);
      return cls;
    };

    const desiredIds = new Set<string>();
    const desired: { post: PostRow; sig: string; expired: boolean; pulse: boolean }[] = [];
    posts.forEach((post) => {
      const relevantTime = post.last_relevant ?? post.created_at;
      const ttl = post.type === "Патруль" ? 5 * 60 * 1000 : 60 * 60 * 1000;
      const expired = isExpired(relevantTime, ttl) || post.irrelevant_count > 0;
      const pulse = !reduced && !expired;
      const sig = `${post.type}|${post.latitude}|${post.longitude}|${expired ? 1 : 0}|${pulse ? 1 : 0}|${headSize}|${post.comment ?? ""}`;
      desiredIds.add(post.post_id);
      desired.push({ post, sig, expired, pulse });
    });

    // Remove deleted/changed markers
    const removed: any[] = [];
    placemarksRef.current.forEach((entry, id) => {
      const stillWanted = desiredIds.has(id);
      const matchedSig = stillWanted
        ? desired.find((d) => d.post.post_id === id)?.sig === entry.sig
        : false;
      if (!stillWanted || !matchedSig) {
        if (entry.line) {
          try { map.geoObjects.remove(entry.line); } catch { /* noop */ }
        }
        removed.push(entry.pm);
        placemarksRef.current.delete(id);
      }
    });

    // Add new/changed placemarks
    const added: any[] = [];
    desired.forEach(({ post, sig, expired, pulse }) => {
      if (placemarksRef.current.has(post.post_id)) return;

      let line: any = null;
      if (post.type === "Патруль" && post.street_geometry?.length) {
        line = new window.ymaps.Polyline(post.street_geometry, {}, { strokeColor: "#ef4444", strokeWidth: 6 });
        map.geoObjects.add(line);
      }

      const layout = getLayout(post.type, expired, pulse);
      const placemark = new window.ymaps.Placemark(
        [post.latitude, post.longitude],
        { hintContent: null, balloonContent: post.comment ?? "" },
        {
          iconLayout: layout,
          hideIconOnBalloonOpen: false,
          iconOffset: [-headSize / 2, -totalH],
          iconShape: {
            type: "Rectangle",
            coordinates: [
              [-headSize / 2 - 10, -6],
              [ headSize / 2 + 10,  totalH + 4]
            ]
          }
        }
      );
      const postId = post.post_id;
      placemark.events.add("click", (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        // Find the current post snapshot at click time to avoid stale closures
        onMarkerClickRef.current(post);
      });
      placemarksRef.current.set(postId, { pm: placemark, sig, line });
      added.push(placemark);
    });

    const totalCount = placemarksRef.current.size;
    const Clusterer = window.ymaps.Clusterer;
    const shouldCluster = !!Clusterer && totalCount >= CLUSTER_MIN_MARKERS;

    if (shouldCluster) {
      if (!clusterRef.current) {
        // Recreate clusterer with all existing placemarks
        clusterRef.current = new Clusterer({
          preset: "islands#invertedBlueClusterIcons",
          groupByCoordinates: false,
          gridSize: 64,
          clusterDisableClickZoom: false
        });
        const all: any[] = [];
        placemarksRef.current.forEach((e) => all.push(e.pm));
        // Detach individually-added markers first (in case we crossed the threshold)
        all.forEach((pm) => { try { map.geoObjects.remove(pm); } catch { /* noop */ } });
        clusterRef.current.add(all);
        map.geoObjects.add(clusterRef.current);
      } else {
        if (removed.length) {
          try { clusterRef.current.remove(removed); } catch { /* noop */ }
        }
        if (added.length) {
          try { clusterRef.current.add(added); } catch { /* noop */ }
        }
      }
    } else {
      if (clusterRef.current) {
        try { map.geoObjects.remove(clusterRef.current); } catch { /* noop */ }
        clusterRef.current = null;
        placemarksRef.current.forEach((e) => {
          try { map.geoObjects.add(e.pm); } catch { /* noop */ }
        });
      } else {
        removed.forEach((pm) => { try { map.geoObjects.remove(pm); } catch { /* noop */ } });
        added.forEach((pm) => { try { map.geoObjects.add(pm); } catch { /* noop */ } });
      }
    }
  }, [posts, markerSize]);

  return (
    <div
      ref={hostRef}
      className={`map-host absolute inset-0 h-full w-full ${addMode ? "map-host--add" : ""}`}
    />
  );
});

function buildMarkerHTML(
  type: string,
  headSize: number,
  spikeHW: number,
  spikeH: number,
  showPulse: boolean,
  expired = false
) {
  let themeClass = "marker-default";
  let svg = "";

  if (type === "Патруль") {
    themeClass = "marker-patrol";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 16h-4m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0m-7 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0"/></svg>`;
  } else if (type === "Нужна помощь") {
    themeClass = "marker-help";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>`;
  } else if (type === "Чисто") {
    themeClass = "marker-clear";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === "Вопрос") {
    themeClass = "marker-question";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>`;
  } else {
    themeClass = "marker-patrol";
    svg = `<svg class="marker-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  }

  const pulse = showPulse ? `<div class="marker-pulse"></div>` : "";
  const totalH = headSize + spikeH;
  const expiredClass = expired ? "marker-expired" : "";

  return `
    <div class="custom-marker ${themeClass} ${expiredClass}" style="width:${headSize}px;height:${totalH}px;">
      <div class="marker-head" style="width:${headSize}px;height:${headSize}px;">
        ${pulse}
        ${svg}
      </div>
      <div class="marker-spike" style="border-left-width:${spikeHW}px;border-right-width:${spikeHW}px;border-top-width:${spikeH}px;"></div>
    </div>
  `;
}
