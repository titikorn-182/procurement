"use client";

import { useRef, useState } from "react";
import { saveW804DraftAction } from "@/app/requests/w804/actions";
import type { W804Draft } from "@/app/requests/w804/model";
import type { W804Identity, W804SaveResult } from "./types";

export function useW804Registry(initial?: W804Identity) {
  const [identity, setIdentity] = useState<W804Identity | undefined>(initial);
  const [saving, setSaving] = useState(false);
  const identityRef = useRef(initial);
  const newId = useRef<string | undefined>(undefined);
  const inFlight = useRef(false);

  async function save(data: W804Draft): Promise<W804SaveResult> {
    if (inFlight.current) return { ok: false, error: "กำลังบันทึก กรุณารอสักครู่" };
    inFlight.current = true;
    setSaving(true);
    try {
      newId.current ??= crypto.randomUUID();
      const current = identityRef.current;
      const result = await saveW804DraftAction({
        id: current?.id ?? newId.current,
        revision: current?.revision ?? 0,
        data,
      });
      if (result.ok) {
        identityRef.current = result.record;
        setIdentity(result.record);
      }
      return result;
    } catch {
      return {
        ok: false,
        error:
          "ติดต่อระบบไม่ได้ ข้อมูลในหน้านี้ยังอยู่ กรุณาลองบันทึกอีกครั้ง หรือดาวน์โหลดแบบร่างเก็บไว้",
      };
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function reset() {
    identityRef.current = undefined;
    newId.current = undefined;
    setIdentity(undefined);
  }
  return { identity, saving, save, reset };
}
