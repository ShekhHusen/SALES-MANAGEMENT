declare namespace google {
  namespace picker {
    interface Picker {
      setVisible(visible: boolean): void;
    }

    class DocsView {
      constructor(viewId?: string);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
      setMode(mode: string): DocsView;
    }

    const DocsViewMode: {
      GRID: string;
      LIST: string;
    };

    class Feature {
      static NAV_HIDDEN: string;
      static MULTISELECT_ENABLED: string;
      static MINE_ONLY: string;
      static SUPPORT_DRIVES: string;
    }

    const ViewId: {
      FOLDERS: string;
      DOCS: string;
    };

    const Action: {
      PICKED: string;
      CANCEL: string;
    };

    class PickerBuilder {
      addView(view: any): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setOrigin(origin: string): PickerBuilder;
      setCallback(callback: (data: any) => void): PickerBuilder;
      enableFeature(feature: string): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      setSize(width: number, height: number): PickerBuilder;
      build(): Picker;
    }
  }
}

interface Window {
  google: typeof google;
  gapi: any;
}
