import { FileInformation } from '../file-information';
import { FileObject } from '../../interfaces/file-obect.interface';

/**
 * @class FileWrapper
 * @classdesc Used to hold FileInformation and allows for lazy loading of it
 */
export class FileWrapper {
  private fileInformation: FileInformation;
  private fileObject: FileObject;

  constructor(fileInformation: FileObject | FileInformation) {
    this.setFileInformation(fileInformation);
  }

  public setFileObject(fileObject: FileObject): void {
    this.fileObject = fileObject;
  }

  public getFileObject(): FileObject {
    return this.fileObject;
  }

  /**
   * @function getFileSrc
   * @async
   * @description retrieve the source path for the file. Will either return the base64 encoding or the file path
   * @return {string} the source for the file
   */
  public getFileSrc(): Promise<string> {
    return new Promise(function(resolve) {
      const fileInformation: FileInformation = this.getFileInformation();
      const fileObject: FileObject = this.getFileObject();

      if (!fileObject) { // Null file
        resolve('');
      } else {
        if (fileObject.path) { // Available path
          resolve(fileObject.path);
        } else { // No available path (only have buffer)
          fileInformation.getAfterInitialized()
            .then(f => {
              resolve(this.createSourceString(fileObject, f.getFileBuffer().toString('base64')));
            });
        }
      }
    }.bind(this));
  }

  public setFileInformation(fileInformation: FileInformation | FileObject): void {
    if (fileInformation instanceof FileInformation) {
      this.fileInformation = fileInformation;
      this.setFileObject(fileInformation.getFileInfo());
    } else { // Set to be lazy loaded - assumes FileObject
      this.setFileObject(fileInformation);
      this.fileInformation = new FileInformation(fileInformation, false);
    }
  }

  /**
   * @function getFileInformation
   * @return {FileInformation} returns the FileInformation object. Does not check if loaded or not.
   */
  public getFileInformation(): FileInformation {
    return this.fileInformation;
  }

  /**
   * @function getFileInformationEnsureLoaded
   * @async
   * @description ensures the FileInformation has been loaded before returning
   * @return {Promise<FileInformation>}
   */
  public getFileInformationEnsureLoaded(): Promise<FileInformation> {
    return this.getFileInformation().getAfterInitialized();
  }

  private createSourceString(fileObject: FileObject, bufferString: string): string {
    return `data:${fileObject.type};base64,${bufferString}`;
  }
}
