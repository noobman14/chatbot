import { useLayoutEffect, useRef } from "react";

export function useAutoScroll<T>(items: T[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef<number>(0);

  const currentLength = items.length;

  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    // 只有当日志数量增加时才自动滚动到底部
    if (containerEl && currentLength > prevLengthRef.current) {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
    prevLengthRef.current = currentLength;
  }, [currentLength]);

  return containerRef;
}

