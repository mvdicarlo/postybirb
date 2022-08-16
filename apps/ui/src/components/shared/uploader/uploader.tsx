import Uppy from '@uppy/core';
import DropTarget from '@uppy/drop-target';
import ImageEditor from '@uppy/image-editor';
import { Dashboard } from '@uppy/react';
import Webcam from '@uppy/webcam';
import XHRUpload from '@uppy/xhr-upload';
import { useContext, useEffect, useMemo } from 'react';
import { AppThemeContext } from '../../../app/app-theme-provider';
import { getUrlSource } from '../../../transports/https';

export default function Uploader() {
  const [theme] = useContext(AppThemeContext);

  const uppy = useMemo(() => {
    const u = new Uppy({
      autoProceed: false,
    });

    u.use(Webcam)
      .use(ImageEditor, {
        id: 'ImageEditor',
        quality: 1,
        cropperOptions: {
          viewMode: 1,
          background: false,
          autoCropArea: 1,
          responsive: true,
          croppedCanvasOptions: {},
        },
        actions: {
          revert: true,
          rotate: true,
          granularRotate: true,
          flip: true,
          zoomIn: true,
          zoomOut: true,
          cropSquare: true,
          cropWidescreen: true,
          cropWidescreenVertical: true,
        },
      })
      .use(XHRUpload, {
        endpoint: `${getUrlSource()}/api/submissions`,
        fieldName: 'files',
        metaFields: ['name'],
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      })
      .use(DropTarget, {
        target: document.body,
      });

    return u;
  }, []);

  useEffect(() => () => uppy.close(), [uppy]);

  return (
    <Dashboard uppy={uppy} theme={theme} plugins={['Webcam', 'ImageEditor']} />
  );
}