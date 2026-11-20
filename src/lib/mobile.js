// lib/mobile.js
// พฤติกรรมแบบแอปมือถือ: ปุ่มย้อนกลับ, ดึงข้อมูลใหม่จากเซิร์ฟเวอร์, ลากลงเพื่อรีเฟรช, สถานะออนไลน์
import { useCallback, useEffect, useRef, useState } from "react";

/** แอปถูกเปิดจากไอคอนบนหน้าจอโฮม (ไม่มีแถบเบราว์เซอร์) */
export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

/**
 * Hardware/gesture "back" (Android back button, iOS swipe-back in the installed app).
 * While `active` (a modal, sheet, chat room or non-home tab is open) we keep one extra
 * history entry; popping it calls onBack() to close the top layer instead of leaving the app.
 */
export function useBackButton(active, onBack) {
  const pushed = useRef(false);
  const ignoreNextPop = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const [pops, setPops] = useState(0);

  useEffect(() => {
    const onPop = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      if (!pushed.current) return;
      pushed.current = false;
      onBackRef.current();
      setPops((n) => n + 1); // re-arm if something is still open after closing the top layer
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (active && !pushed.current) {
      window.history.pushState({ eduLayer: true }, "");
      pushed.current = true;
    } else if (!active && pushed.current) {
      // Closed from the UI (X button etc.): drop our extra entry so "back" stays in step.
      pushed.current = false;
      ignoreNextPop.current = true;
      window.history.back();
    }
  }, [active, pops]);
}

/**
 * Keep this device up to date with the server: on start, when the app comes back to the
 * foreground, when the network returns, and every few seconds while visible.
 * Never pulls while a local change is still on its way to the server (sync-bridge.js).
 */
export function useServerRefresh(data, dispatch, migrate) {
  const dataRef = useRef(data);
  dataRef.current = data;
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (manual = false) => {
      const sync = window.EduMarketSync;
      if (!sync?.fetchServerState || !navigator.onLine) return false;
      if (sync.hasPendingChanges()) return false;
      if (manual) setRefreshing(true);
      try {
        const raw = await sync.fetchServerState();
        if (sync.hasPendingChanges()) return false; // the user changed something meanwhile
        const next = migrate(raw);
        if (!next) return false;
        if (JSON.stringify(next) === JSON.stringify(dataRef.current)) return false;
        sync.skipNextPush(); // storing the server copy must not be echoed back to the server
        dispatch({ type: "REPLACE_STATE", state: next });
        return true;
      } catch {
        return false;
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [dispatch, migrate],
  );

  useEffect(() => {
    refresh();
    const whenVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", whenVisible);
    window.addEventListener("online", whenVisible);
    const timer = setInterval(whenVisible, 12000);
    return () => {
      document.removeEventListener("visibilitychange", whenVisible);
      window.removeEventListener("online", whenVisible);
      clearInterval(timer);
    };
  }, [refresh]);

  return { refresh, refreshing };
}

/** Pull down at the top of the page to refresh (installed app only — browsers have their own). */
export function usePullToRefresh(onRefresh, enabled) {
  const [pull, setPull] = useState(0);
  const start = useRef(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onStart = (e) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      pullRef.current = dy > 0 ? Math.min(dy * 0.5, 90) : 0;
      setPull(pullRef.current);
    };
    const onEnd = () => {
      if (start.current !== null && pullRef.current >= 60) onRefresh(true);
      start.current = null;
      pullRef.current = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, onRefresh]);

  return pull;
}

/** navigator.onLine as React state */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/**
 * iOS keyboard: keep full-screen panels (chat room) inside the visible area by exposing
 * the visual viewport as CSS variables --vv-height / --vv-top.
 */
export function useVisualViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--vv-height", `${vv.height}px`);
      root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--vv-top");
    };
  }, []);
}
