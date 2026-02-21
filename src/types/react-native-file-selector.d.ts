declare module 'react-native-file-selector' {
  interface FileSelectorOptions {
    title?: string;
    onDone?: (path: string) => void;
    onCancel?: () => void;
  }

  const FileSelector: {
    Show(options: FileSelectorOptions): void;
  };

  export default FileSelector;
}
