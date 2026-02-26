import type { SceneAdapterFactory, SceneEngine } from "@/lib/3d/adapter";
import { createNoopAdapter } from "@/lib/3d/noop-adapter";

export async function getSceneAdapter(engine: SceneEngine): Promise<SceneAdapterFactory> {
  if (engine === "none") {
    return createNoopAdapter;
  }

  if (engine === "babylon") {
    const adapterModule = await import("@/lib/3d/babylon-adapter");
    return adapterModule.createBabylonAdapter;
  }

  // Exhaustive fallback for future additions.
  return createNoopAdapter;
}
