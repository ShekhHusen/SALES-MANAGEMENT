import { useState, useEffect } from 'react';

export const useGooglePicker = (accessToken: string | null) => {
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);

  useEffect(() => {
    if (window.google?.picker) {
      setPickerApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('picker', {
        callback: () => {
          setPickerApiLoaded(true);
        }
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const showPicker = (onPick: (folderUrl: string) => void) => {
    if (!pickerApiLoaded || !accessToken || !window.google?.picker) return;

    const pickerOrigin =
      window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder')
      .setMode(window.google.picker.DocsViewMode.GRID);

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setOrigin(pickerOrigin)
      .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
      .setTitle('Select Google Drive Folder')
      .setSize(800, 600)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          onPick(file.url);
        }
      })
      .build();

    picker.setVisible(true);
  };

  return { showPicker, isReady: pickerApiLoaded && !!accessToken };
};
