import { BrowserWindow } from 'electron';
import { MulterFileInfo } from '../models/multer-file-info';

interface MediaMetadata {
  duration: number;
  height: number;
  width: number;
}

export class MediaUtils {
  static async getMetadata(
    file: MulterFileInfo,
    buf: Buffer,
  ): Promise<MediaMetadata> {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      await win.loadURL('about:blank');

      const tagName = file.mimetype.startsWith('video/') ? 'video' : 'audio';
      const mimeType = file.mimetype;

      const base64 = buf.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const extractMetadata = `
      (() => {
        return new Promise((resolve, reject) => {
          const media = document.createElement('${tagName}');
          media.src = '${dataUrl}';
          media.style.display = 'none';
          document.body.appendChild(media);

          let done = false;
          const cleanup = () => {
            if (done) return;
            done = true;
            media.remove();
          };

          const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Metadata loading timed out'));
          }, 10000);

          media.onloadedmetadata = () => {
            clearTimeout(timer);
            const meta = {
              duration: media.duration,
            };
            if ('${tagName}' === 'video') {
              meta.width = media.videoWidth;
              meta.height = media.videoHeight;
            }
            cleanup();
            resolve(meta);
          };

          media.addEventListener('error', (e) => {
            clearTimeout(timer);
            cleanup();
            const obj = {}
            for (const key in e) {
              obj[key] = e[key]
            }
            reject(new Error('Failed to load media: ' + (JSON.stringify(obj) || 'unknown')));
          });
        });
      })();
    `;
      const metadata: MediaMetadata =
        await win.webContents.executeJavaScript(extractMetadata);

      return metadata;
    } finally {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    }
  }
}
