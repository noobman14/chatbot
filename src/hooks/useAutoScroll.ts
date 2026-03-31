import { useRef, useEffect } from "react";

export function useAutoScroll(dependencies: any[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef<number>(0);

  // 获取消息数组的长度（假设第一个依赖是消息数组）
  const currentLength = Array.isArray(dependencies[0]) ? dependencies[0].length : 0;

  useEffect(() => {
    const containerEl = containerRef.current;
    // 只有当消息数量增加时才自动滚动到底部
    if (containerEl && currentLength > prevLengthRef.current) {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
    prevLengthRef.current = currentLength;
  }, [currentLength]);

  return containerRef;
}

