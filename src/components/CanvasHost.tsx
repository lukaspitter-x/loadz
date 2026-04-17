"use client";

import dynamic from "next/dynamic";

const InfiniteCanvas = dynamic(() => import("./InfiniteCanvas"), {
  ssr: false,
});

export default function CanvasHost() {
  return (
    <div className="relative flex-1 h-full">
      <InfiniteCanvas />
    </div>
  );
}
