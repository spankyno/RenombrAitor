"use client";

import { useEffect, useState } from "react";

export interface UsageInfo {
  isAuthenticated: boolean;
  remaining: number;
  used: number;
  maxFiles: number;
  isLoading: boolean;
}

export function useUsage(): UsageInfo & { recordSession: () => Promise<boolean> } {
  const [info, setInfo] = useState<UsageInfo>({
    isAuthenticated: false,
    remaining: 2,
    used: 0,
    maxFiles: 50,
    isLoading: true,
  });

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => setInfo({ ...data, isLoading: false }))
      .catch(() => setInfo((prev) => ({ ...prev, isLoading: false })));
  }, []);

  const recordSession = async (): Promise<boolean> => {
    if (info.isAuthenticated) return true;
    try {
      const res = await fetch("/api/usage", { method: "POST" });
      const data = await res.json();
      if (!data.ok) return false;
      setInfo((prev) => ({ ...prev, remaining: data.remaining, used: (prev.used ?? 0) + 1 }));
      return true;
    } catch {
      return false;
    }
  };

  return { ...info, recordSession };
}
