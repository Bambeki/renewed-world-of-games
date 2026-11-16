"use client";
import { useCallback, useEffect, useState } from "react";
export function useCampaign<T>(
  key: string,
  create: () => T,
  read: (v: unknown) => T | null,
) {
  const [state, setState] = useState<T>(create);
  const [ready, setReady] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  useEffect(() => {
    let next: T | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        next = read(JSON.parse(raw));
        if (!next)
          setSaveNotice(
            "The saved campaign could not be read. A new campaign has been started.",
          );
      }
    } catch (error) {
      if (error instanceof SyntaxError)
        setSaveNotice(
          "The saved campaign was corrupted. A new campaign has been started.",
        );
      else
        setSaveNotice(
          "Saving is unavailable in this browser. You can play this session, but progress may be lost.",
        );
    }
    if (next) setState(next);
    setReady(true);
  }, [key, read]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      setSaveNotice(
        "Progress could not be saved. Keep this page open to continue your session.",
      );
    }
  }, [key, ready, state]);
  const reset = useCallback((next: T) => {
    setState(next);
  }, []);
  return { state, setState, ready, saveNotice, reset };
}
