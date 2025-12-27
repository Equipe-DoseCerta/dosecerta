declare module 'react-native-sound' {
  export default class Sound {
    static MAIN_BUNDLE: string;
    static setCategory(category: string): void;

    constructor(
      filename: string | number,
      basePath: string,
      onError?: (error?: any) => void
    );

    play(onEnd?: (success: boolean) => void): void;
    stop(onStop?: () => void): void;
    release(): void;
    setVolume(volume: number): void;
    setNumberOfLoops(value: number): void;
  }
}
