import { MapPageClient } from "@/components/MapPageClient";
import { TopOverlay } from "@/components/TopOverlay";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-stone-950">
      <TopOverlay />

      <main className="h-full w-full">
        <MapPageClient />
      </main>
    </div>
  );
}
