export type SceneMountOptions = {
  width: number;
  height: number;
  devicePixelRatio: number;
};

export type SceneController = {
  resize(next: Pick<SceneMountOptions, "width" | "height" | "devicePixelRatio">): void;
  dispose(): void;
};

export type SceneAdapterFactory<Config = Record<string, unknown>> = (
  host: HTMLElement,
  options: SceneMountOptions,
  config?: Config
) => Promise<SceneController>;

export type SceneEngine = "none" | "babylon";

export function readMountOptions(host: HTMLElement): SceneMountOptions {
  const rect = host.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
    devicePixelRatio: typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1
  };
}
