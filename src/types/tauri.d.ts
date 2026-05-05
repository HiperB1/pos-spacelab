declare module '@tauri-apps/plugin-updater' {
  export function check(): Promise<any>;
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>;
}