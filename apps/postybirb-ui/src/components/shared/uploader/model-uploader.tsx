/* eslint-disable react/require-default-props */
import { ISubmissionDto } from '@postybirb/types';
import Compressor from '@uppy/compressor';
import Uppy from '@uppy/core';
import ImageEditor from '@uppy/image-editor';
import { DashboardModal } from '@uppy/react';
import Webcam from '@uppy/webcam';
import XHRUpload from '@uppy/xhr-upload';
import { useContext, useEffect, useMemo } from 'react';
import { AppThemeContext } from '../../../app/app-theme-provider';
import { defaultTargetProvider } from '../../../transports/http-client';

type UploaderProps = {
  accept?: string[];
  endpointPath: string;
  isOpen: boolean;
  compress?: boolean;
  onComplete?: (submissionDto: ISubmissionDto) => void;
  onClose: () => void;
};

export default function ModalUploader(props: UploaderProps) {
  const [theme] = useContext(AppThemeContext);
  const { accept, compress, isOpen, endpointPath, onClose, onComplete } = props;

  const uppy = useMemo(() => {
    const u = new Uppy({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: accept,
      },
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
        fieldName: 'file',
        allowedMetaFields: ['name'],
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });

    u.on('complete', (e) => {
      if (onComplete) {
        if (e.successful.length) {
          onComplete(
            e.successful[0]?.response?.body as unknown as ISubmissionDto
          );
        }
      }
    });

    if (compress) {
      u.use(Compressor, {
        quality: 0.8,
      });
    }

    return u;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointPath, onComplete, compress]);

  useEffect(() => () => uppy.close(), [uppy]);

  return (
    <div className="postybirb__uploader">
      <DashboardModal
        closeModalOnClickOutside
        open={isOpen}
        uppy={uppy}
        theme={theme}
        // eslint-disable-next-line lingui/no-unlocalized-strings
        plugins={['Webcam', 'ImageEditor']}
        width="100%"
        onRequestClose={onClose}
      />
    </div>
  );
}
