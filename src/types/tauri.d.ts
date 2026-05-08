export interface DownloadProgress {
  event: 'Started' | 'Progress' | 'Finished';
  data?: {
    contentLength?: number;
    chunkLength?: number;
  };
}

export interface Update {
  version: string;
  date?: string;
  body?: string;
  currentVersion?: string;
  available?: boolean;
  downloaded?: boolean;
  download(): Promise<void>;
  install(): Promise<void>;
  downloadAndInstall(onEvent?: (progress: DownloadProgress) => void): Promise<void>;
}

declare module '@tauri-apps/plugin-updater' {
  export function check(): Promise<Update | null>;
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>;
}