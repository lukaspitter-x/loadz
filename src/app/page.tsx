import CanvasHost from "@/components/CanvasHost";
import SettingsPanel from "@/components/SettingsPanel";
import TopBar from "@/components/TopBar";
import Fab from "@/components/Fab";
import ThemeSync from "@/components/ThemeSync";

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ThemeSync />
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <CanvasHost />
        <SettingsPanel />
      </div>
      <Fab />
      <div className="pointer-events-none fixed bottom-1.5 right-3 text-[10px] text-muted-foreground/70 font-mono">
        Built with ♥ by DCP
      </div>
    </div>
  );
}
