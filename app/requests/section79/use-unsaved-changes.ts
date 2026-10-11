"use client";

import { useEffect } from "react";

const leaveMessage =
  "ข้อมูลและไฟล์แนบอยู่เฉพาะในหน้านี้ กรุณาบันทึกแบบร่างลงเครื่องก่อนออก ต้องการออกจากหน้าหรือไม่?";

type HistoryNavigateEvent = Event & {
  navigationType?: string;
  hashChange?: boolean;
  destination?: { sameDocument?: boolean };
};

/**
 * No data is persisted and no history entries are inserted or rewritten.
 * The Navigation API can cancel same-document traversals before the router runs;
 * popstate is deliberately not used because that event is not cancelable.
 * Older browsers and noncancelable browser escape-hatch traversals cannot be
 * blocked here. Downloads remain the durable copy, and beforeunload protects
 * ordinary cross-document departures where the browser permits a prompt.
 */
export function useUnsavedChanges(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: Event) => {
      const traversal = event as HistoryNavigateEvent;
      if (
        traversal.navigationType !== "traverse" ||
        !traversal.destination?.sameDocument ||
        traversal.hashChange ||
        !event.cancelable ||
        event.defaultPrevented
      )
        return;
      if (!window.confirm(leaveMessage)) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (!window.confirm(leaveMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    navigation?.addEventListener("navigate", navigate);
    window.document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      navigation?.removeEventListener("navigate", navigate);
      window.document.removeEventListener("click", click, true);
    };
  }, [enabled]);
}
