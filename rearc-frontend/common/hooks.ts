"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to detect page visibility
 * Returns true when page is visible, false when hidden
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Hook for smart polling that pauses when page is hidden
 * Automatically refreshes when page becomes visible
 */
export function useSmartPolling(
  callback: () => void | Promise<void>,
  interval: number,
  options?: {
    enabled?: boolean;
    hiddenInterval?: number; // Slower interval when hidden (default: 4x)
    immediate?: boolean; // Call immediately on mount
  }
) {
  const isVisible = usePageVisibility();
  const { enabled = true, hiddenInterval, immediate = true } = options || {};
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Use slower interval when hidden, or pause completely
    const effectiveInterval = isVisible 
      ? interval 
      : (hiddenInterval || interval * 4); // 4x slower when hidden

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Call immediately if enabled and (immediate flag is true or page just became visible)
    if (immediate || isVisible) {
      callbackRef.current();
    }

    // Set up polling
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, effectiveInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, isVisible, enabled, hiddenInterval, immediate]);
}

/**
 * Hook to debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

