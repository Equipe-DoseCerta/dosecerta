// src/types/react-native-share.d.ts
declare module 'react-native-share' {
  export interface ShareOptions {
    url?: string;
    urls?: string[];
    filename?: string;
    filenames?: string[];
    type?: string;
    message?: string;
    title?: string;
    subject?: string;
    activityItemSources?: any[];
    failOnCancel?: boolean;
    showAppsToView?: boolean;
    excludedActivityTypes?: string[];
    [key: string]: any;
  }

  export interface ShareSingleReturn {
    message?: string;
    success: boolean;
  }

  export default class Share {
    static open(options: ShareOptions): Promise<ShareSingleReturn>;
    static isPackageInstalled(packageName: string): Promise<{ isInstalled: boolean }>;
    static shareSingle(options: ShareOptions): Promise<ShareSingleReturn>;
  }
}