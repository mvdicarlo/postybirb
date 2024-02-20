import Uppy from '@uppy/core';
import DropTarget from '@uppy/drop-target';
import ImageEditor from '@uppy/image-editor';
import { Dashboard } from '@uppy/react';
import Webcam from '@uppy/webcam';
import XHRUpload from '@uppy/xhr-upload';
import { useContext, useEffect, useMemo } from 'react';
import { AppThemeContext } from '../../../app/app-theme-provider';
import { defaultTargetProvider } from '../../../transports/http-client';

type UploaderProps = {
  endpointPath: string;
  // eslint-disable-next-line react/require-default-props
  onComplete?: () => void;
};

export default function Uploader(props: UploaderProps) {
  const [theme] = useContext(AppThemeContext);
  const { endpointPath, onComplete } = props;

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
        endpoint: `${defaultTargetProvider()}/${endpointPath}`,
        fieldName: 'files',
        allowedMetaFields: ['name'],
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      })
      .use(DropTarget, {
        target: document.body,
      });

    u.on('complete', () => {
      if (onComplete) {
        onComplete();
      }
    });

    return u;
  }, [endpointPath, onComplete]);

  useEffect(() => () => uppy.close(), [uppy]);

  return (
    <div className="postybirb__uploader">
      <Dashboard
        uppy={uppy}
        theme={theme}
        // eslint-disable-next-line lingui/no-unlocalized-strings
        plugins={['Webcam', 'ImageEditor']}
        width="100%"
        height="450px"
      />
    </div>
  );
}
