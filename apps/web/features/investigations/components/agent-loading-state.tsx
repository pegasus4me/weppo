"use client";

import { useEffect, useState } from "react";

const chevron = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

function useElapsed() {
  const [deciseconds, setDeciseconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setDeciseconds((value) => value + 1),
      100,
    );
    return () => window.clearInterval(timer);
  }, []);

  const seconds = deciseconds / 10;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

export function AgentLoadingState({ label }: { label: string }) {
  const elapsed = useElapsed();

  return (
    <div className="flex w-fit items-center gap-2.5" aria-live="polite">
      <span
        aria-hidden="true"
        className="grid grid-cols-[repeat(3,4px)] gap-[1.5px] text-foreground"
      >
        {chevron.map((delay, index) => (
          <span
            key={index}
            className="size-[4px] rounded-[1px] bg-current"
            style={{
              opacity: 0.15,
              animation: `agent-pixel-on 650ms ease-in-out ${delay}ms infinite`,
            }}
          />
        ))}
      </span>
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <span className="font-mono text-xs tabular-nums text-text-tertiary">
        {elapsed}
      </span>
    </div>
  );
}
