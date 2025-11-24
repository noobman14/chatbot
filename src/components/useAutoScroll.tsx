import { useRef, useEffect } from "react";
export function useAutoScroll(dependencies: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
  }, [dependencies]);
  return containerRef;
}
