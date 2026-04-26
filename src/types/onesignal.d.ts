// OneSignal Web SDK v16 — minimal type declarations
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalAPI) => void | Promise<void>>;
    OneSignal?: OneSignalAPI;
  }
}

export interface OneSignalAPI {
  init(options: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    serviceWorkerParam?: { scope: string };
    serviceWorkerPath?: string;
    notifyButton?: { enable: boolean };
    autoResubscribe?: boolean;
    autoRegister?: boolean;
  }): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: {
    permission: boolean;
    permissionNative: NotificationPermission;
    requestPermission(): Promise<NotificationPermission>;
    addEventListener(event: "permissionChange" | "permissionPromptDisplay", cb: (perm: boolean) => void): void;
  };
  User: {
    PushSubscription: {
      id: string | null | undefined;
      token: string | null | undefined;
      optedIn: boolean;
      optIn(): Promise<void>;
      optOut(): Promise<void>;
      addEventListener(
        event: "change",
        cb: (change: {
          previous: { id?: string | null; token?: string | null; optedIn: boolean };
          current: { id?: string | null; token?: string | null; optedIn: boolean };
        }) => void
      ): void;
    };
  };
}

export {};
