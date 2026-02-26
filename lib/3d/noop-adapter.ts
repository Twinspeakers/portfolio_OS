import type { SceneAdapterFactory, SceneController } from "@/lib/3d/adapter";

const noopController: SceneController = {
  resize() {
    // Intentionally no-op. Useful for routes without an active 3D runtime.
  },
  dispose() {
    // Intentionally no-op.
  }
};

export const createNoopAdapter: SceneAdapterFactory = async () => noopController;
