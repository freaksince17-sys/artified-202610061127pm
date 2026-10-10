import { useState, useEffect, useRef } from 'react';

/**
 * Custom React hook for viewport intersection observation.
 * Defers initializing heavy network requests for photos/videos until they enter the viewport.
 */
export function useInView(options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Retain loaded state once visible
        }
      },
      {
        rootMargin: '200px 0px', // Preload 200px before scrolling into viewport
        threshold: 0.01,
        ...options
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { containerRef, isInView };
}
