"use client";

import { Plus } from "lucide-react";
import { useLoaderStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export default function Fab() {
  const addLoader = useLoaderStore((s) => s.addLoader);
  return (
    <Button
      size="icon"
      onClick={() => addLoader()}
      className="fixed left-1/2 bottom-6 -translate-x-1/2 z-40 h-12 w-12 rounded-full shadow-lg border"
      aria-label="Add loader"
      title="Add loader"
    >
      <Plus size={20} />
    </Button>
  );
}
