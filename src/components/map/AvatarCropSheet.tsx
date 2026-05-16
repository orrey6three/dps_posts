"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

type Props = {
  file: File;
  onCancel: () => void;
  /** Готовый квадрат JPEG */
  onConfirm: (file: File) => void;
};

const FRAME = 280;
const OUT_SIZE = 512;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function AvatarCropSheet({ file, onCancel, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  const cropRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const pointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const pinchDistRef = useRef<number | null>(null);

  const zoomRef = useRef(1);
  const panRef = useRef(pan);
  panRef.current = pan;
  zoomRef.current = zoom;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [file]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const layout = useMemo(() => {
    const iw = natural.w;
    const ih = natural.h;
    if (!iw || !ih) return null;
    const base = Math.max(FRAME / iw, FRAME / ih);
    const dispW = iw * base * zoom;
    const dispH = ih * base * zoom;
    const maxPX = Math.max(0, (dispW - FRAME) / 2);
    const maxPY = Math.max(0, (dispH - FRAME) / 2);
    return { base, dispW, dispH, maxPX, maxPY };
  }, [natural, zoom]);

  const clampPan = useCallback(
    (px: number, py: number) => {
      if (!layout) return { x: 0, y: 0 };
      return {
        x: clamp(px, -layout.maxPX, layout.maxPX),
        y: clamp(py, -layout.maxPY, layout.maxPY),
      };
    },
    [layout]
  );

  /** Зум так, чтобы точка кадра (mx, my) оставалась на том же месте на фото */
  const zoomAtPoint = useCallback((mx: number, my: number, rawZoom: number) => {
    const iw = natural.w;
    const ih = natural.h;
    if (!iw || !ih) return;
    const newZoom = clamp(rawZoom, ZOOM_MIN, ZOOM_MAX);
    const base = Math.max(FRAME / iw, FRAME / ih);
    const zPrev = zoomRef.current;
    const dispW = iw * base * zPrev;
    const dispH = ih * base * zPrev;
    const L = (FRAME - dispW) / 2 + panRef.current.x;
    const T = (FRAME - dispH) / 2 + panRef.current.y;
    const fx = dispW > 1e-6 ? (mx - L) / dispW : 0.5;
    const fy = dispH > 1e-6 ? (my - T) / dispH : 0.5;
    const dispWn = iw * base * newZoom;
    const dispHn = ih * base * newZoom;
    const Ln = mx - fx * dispWn;
    const Tn = my - fy * dispHn;
    let panX = Ln - (FRAME - dispWn) / 2;
    let panY = Tn - (FRAME - dispHn) / 2;
    const maxPX = Math.max(0, (dispWn - FRAME) / 2);
    const maxPY = Math.max(0, (dispHn - FRAME) / 2);
    panX = clamp(panX, -maxPX, maxPX);
    panY = clamp(panY, -maxPY, maxPY);
    setPan({ x: panX, y: panY });
    setZoom(newZoom);
  }, [natural.w, natural.h]);

  useEffect(() => {
    const el = cropRef.current;
    if (!el || !natural.w) return;
    const onWheel = (e: WheelEvent) => {
      if (!natural.w || !natural.h) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.002;
      const factor = Math.exp(delta);
      const zPrev = zoomRef.current;
      zoomAtPoint(mx, my, zPrev * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [natural.w, natural.h, zoomAtPoint]);

  function onImgLoad(e: SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    setNatural({ w: el.naturalWidth, h: el.naturalHeight });
  }

  function pinchMidInFrame(): { midX: number; midY: number; dist: number } | null {
    const rect = cropRef.current?.getBoundingClientRect();
    const ids = [...pointersRef.current.keys()];
    if (ids.length < 2 || !rect) return null;
    const p1 = pointersRef.current.get(ids[0])!;
    const p2 = pointersRef.current.get(ids[1])!;
    const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
    const midX = (p1.clientX + p2.clientX) / 2 - rect.left;
    const midY = (p1.clientY + p2.clientY) / 2 - rect.top;
    return { midX, midY, dist };
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout) return;
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    const el = e.currentTarget;

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        ox: e.clientX,
        oy: e.clientY,
        px: panRef.current.x,
        py: panRef.current.y,
      };
      el.setPointerCapture(e.pointerId);
    }

    if (pointersRef.current.size >= 2) {
      dragRef.current = null;
      pinchDistRef.current = null;
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout) return;
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const pinch = pinchMidInFrame();
    if (pinch && pinch.dist > 8) {
      if (pinchDistRef.current == null) {
        pinchDistRef.current = pinch.dist;
        return;
      }
      const scale = pinch.dist / pinchDistRef.current;
      pinchDistRef.current = pinch.dist;
      zoomAtPoint(pinch.midX, pinch.midY, zoomRef.current * scale);
      return;
    }

    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.ox;
    const dy = e.clientY - d.oy;
    setPan(clampPan(d.px + dx, d.py + dy));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchDistRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }

    if (pointersRef.current.size === 0) {
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      const p = [...pointersRef.current.values()][0];
      dragRef.current = {
        ox: p.clientX,
        oy: p.clientY,
        px: panRef.current.x,
        py: panRef.current.y,
      };
    }
  };

  async function confirmCrop() {
    if (!layout || !natural.w || !objectUrl) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Не удалось прочитать фото"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = OUT_SIZE;
      canvas.height = OUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas недоступен");

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const base = Math.max(OUT_SIZE / iw, OUT_SIZE / ih);
      const dispW = iw * base * zoom;
      const dispH = ih * base * zoom;
      const sx = (OUT_SIZE - dispW) / 2 + pan.x * (OUT_SIZE / FRAME);
      const sy = (OUT_SIZE - dispH) / 2 + pan.y * (OUT_SIZE / FRAME);

      ctx.drawImage(img, sx, sy, dispW, dispH);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Ошибка кодирования"))), "image/jpeg", 0.9);
      });
      const name = file.name.replace(/\.\w+$/, "") + "-avatar.jpg";
      const outFile = new File([blob], name, { type: "image/jpeg" });
      onConfirm(outFile);
    } finally {
      setBusy(false);
    }
  }

  const disp = layout
    ? {
        w: layout.dispW,
        h: layout.dispH,
        left: (FRAME - layout.dispW) / 2 + pan.x,
        top: (FRAME - layout.dispH) / 2 + pan.y,
      }
    : null;

  const sliderPercent = Math.round(zoom * 100);

  const overlay = (
    <div
      className="fixed inset-0 z-[110] flex flex-col justify-end bg-black/45 px-3 pb-[env(safe-area-inset-bottom,12px)] pt-8 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Обрезка аватара"
    >
      <div
        className="mx-auto w-full max-w-md rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-2xl"
        style={{ marginBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>
          Кадрирование
        </p>
        <p className="ui-soft mt-1 text-[12px] leading-snug">
          Перетаскивание — сдвиг. Два пальца — масштаб. Колёсико у мыши — зум к курсору. Ползунок — зум от центра.
        </p>

        <div
          ref={cropRef}
          className="relative mx-auto mt-3 overflow-hidden rounded-2xl bg-[#1a1524] touch-none"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {objectUrl ? (
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              className="pointer-events-none absolute select-none"
              style={
                disp
                  ? {
                      width: disp.w,
                      height: disp.h,
                      left: disp.left,
                      top: disp.top,
                    }
                  : { opacity: 0 }
              }
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/90"
            style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}
          />
        </div>

        <label className="mt-4 grid gap-1">
          <span className="ui-eyebrow flex items-center justify-between gap-2">
            <span>Масштаб</span>
            <span className="tabular-nums normal-case tracking-normal" style={{ color: "var(--color-brand-deep)" }}>
              {sliderPercent}%
            </span>
          </span>
          <input
            type="range"
            min={ZOOM_MIN * 100}
            max={ZOOM_MAX * 100}
            step={1}
            value={sliderPercent}
            onChange={(e) => zoomAtPoint(FRAME / 2, FRAME / 2, Number(e.target.value) / 100)}
            className="w-full cursor-pointer accent-[color:var(--color-brand-accent)] touch-pan-y"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" type="button" disabled={busy} onClick={onCancel}>
            Отмена
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            type="button"
            disabled={busy || !layout}
            onClick={() => void confirmCrop()}
          >
            {busy ? "…" : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
