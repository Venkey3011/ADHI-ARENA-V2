export {};

type WifiNetwork = {
  ssid: string;
  signal: number;
  authentication: string;
  encryption: string;
  secured: boolean;
  saved: boolean;
  connected: boolean;
};

type NetworkStatus = {
  supported: boolean;
  connectedSsid: string;
  networks: WifiNetwork[];
  message?: string;
  error?: string;
  locationPermissionRequired?: boolean;
};

declare global {
  interface Window {
    adhiArena?: {
      network: {
        scan(): Promise<NetworkStatus>;
        openLocationSettings(): Promise<void>;
        connect(request: {
          ssid: string;
          password?: string;
          secured: boolean;
          saved: boolean;
        }): Promise<NetworkStatus>;
      };
      updates: {
        check(): Promise<{ ok: boolean; message?: string }>;
        getVersion(): Promise<string>;
        openAdminReleasePage(): Promise<void>;
        onStatus(callback: (status: {
          state: string;
          version?: string;
          percent?: number;
          message?: string;
        }) => void): () => void;
      };
      exam: {
        setActive(active: boolean): void;
      };
    };
  }
}
