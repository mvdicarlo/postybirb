import { FileObject } from '../interfaces/file-obect.interface';

/**
 * @class FileInformation
 * @classdesc A class used to holding information pertaining to a submission file
 * This holds the standard File object supported by browsers, as well as its buffer, and values as FileObject
 */
export class FileInformation {
  private buffer: any;
  private realFile: File;
  private fileInfo: FileObject;
  private isLoading: boolean;
  private initialized: boolean;

  constructor(file: File | FileObject, initialize: boolean) {
    if (file instanceof File) { // an actual File
      this.setRealFile(file);
      this.setFileInfo(this.convertFileToFileObject(file));
      if (initialize) {
        this.convertFileInfoToBuffer(this.getFileInfo()).then((buffer) => {
          this.setBuffer(buffer);
        });
      }
    } else {
      const isBuffer: boolean = file instanceof window['Buffer'];

      if (isBuffer) { //File Buffer
        this.setBuffer(file);
        this.setRealFile(this.convertBufferToFile(file, {
          type: 'image/png',
          size: 0,
          name: 'unknown.png',
          path: ''
        }));
        this.setFileInfo(this.convertFileToFileObject(this.getRealFile()));
        this.initialized = true;
      } else if (file && file.path) { //Self-created FileObject
        this.setFileInfo(file);
        if (initialize) {
          this.convertFileInfoToBuffer(file).then((buffer) => {
            this.setBuffer(buffer);
            this.setRealFile(this.convertBufferToFile(buffer, file));
          });
        }
      } else {
        this.setBuffer(null);
        this.setFileInfo(null);
        this.setRealFile(null);
      }
    }

    this.initialized = this.initialized || initialize;
  }

  private convertFileInfoToBuffer(fileInfo: FileObject): Promise<any> {
    this.isLoading = true;
    return new Promise(function(resolve, reject) {
      window['readFile'](fileInfo.path, (buffer) => {
        resolve(buffer);
      }, (readErr) => {
        reject(Error('Unable to convert file to buffer'))
      }, () => this.isLoading = false);
    }.bind(this));
  }

  private convertBufferToFile(buffer: any, fileInfo: FileObject): any {
    const fakeForm = new FormData();
    const params = { type: fileInfo.type, name: fileInfo.name };
    fakeForm.set('tmp', new Blob([new Uint8Array(buffer)], params), fileInfo.name);

    return fakeForm.get('tmp');
  }

  private convertFileToFileObject(file: File): FileObject {
    return {
      name: file.name,
      path: file['path'],
      size: file.size,
      type: file.type,
    };
  }

  private setRealFile(file: File): void {
    this.realFile = file;
  }

  private setFileInfo(fileInfo: FileObject): void {
    this.fileInfo = fileInfo;
  }

  private setBuffer(fileBuffer: any): void {
    this.buffer = fileBuffer;
  }

  public initialize(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve(this.initialized);
      } else {
        const file = this.getFileInfo();
        if (this.getFileInfo()) {
          this.convertFileInfoToBuffer(file).then((buffer) => {
            this.setBuffer(buffer);
            this.setRealFile(this.convertBufferToFile(buffer, file));
            this.initialized = true;
            resolve(this.initialized);
          }).catch(() => { // This shouldn't happen
            this.initialized = true;
            resolve(this.initialized);
          });
        } else { //Only happens if we are initializing a null object
          this.initialized = true;
          resolve(this.initialized);
        }
      }
    });
  }

  public getAfterInitialized(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve(this);
      } else {
        this.initialize().then(() => {
          resolve(this)
        }).catch(() => resolve(this));
      }
    });
  }

  public getRealFile(): File {
    return this.realFile;
  }

  public getFileInfo(): FileObject {
    return this.fileInfo;
  }

  public getFileBuffer(): any {
    return this.buffer;
  }

  public getSize(): number {
    const info = this.getFileInfo();
    return info ? info.size : 0;
  }

  public getSizeAsMB(): number {
    return Number((this.getSize() / 1000000).toFixed(2));
  }

  public getName(): string {
    const info = this.getFileInfo();
    return info ? info.name : '';
  }

  public isValid(): boolean {
    return Boolean(this.getFileInfo()) && Boolean(this.getRealFile());
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isLoadingBuffer(): boolean {
    return this.isLoading;
  }

  public toString(): string {
    return JSON.stringify(this.getFileInfo());
  }

}
