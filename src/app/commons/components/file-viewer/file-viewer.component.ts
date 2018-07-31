import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FileInformation } from '../../models/file-information';

@Component({
  selector: 'file-viewer',
  templateUrl: './file-viewer.component.html',
  styleUrls: ['./file-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Component used to display an image from a FileInformation or File
 * Mostly unused now
 */
export class FileViewerComponent implements OnInit, OnChanges {
  @Input() height: number = 50;
  @Input() width: number = 50;
  @Input() file: File;

  public name: string;
  public src: any;
  public type: string;
  public show: boolean;
  public mimeType: string;
  public fileIcon: string;

  constructor(private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.handleFile(this.file);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.file) {
        this.file = changes.file.currentValue;
        this.handleFile(this.file);
      }

      if (changes.width) {
        this.width = changes.width.currentValue;
      }

      if (changes.height) {
        this.height = changes.height.currentValue;
      }
    }
  }

  /**
   * @function handleFileInformation
   * @param {File|FileObject|any} fileInfo
   * @description sets component fields based on file information passed in
   */
  private handleFileInformation(fileInfo: any = {}): void {
    const MIME: string = (fileInfo.type || '').split('/')[0];
    this.mimeType = MIME || null;;
    this.type = fileInfo.type || '';
    this.name = fileInfo.name || '';
    this.src = fileInfo.path || '';
    this.show = fileInfo.type ? true : false;
  }

  /**
   * @function handleFile
   * @param {FileInformation|File} - file object to be analyzed
   * @description tries to get display information for component
   */
  private handleFile(file: FileInformation | File): void {
    if (!file) return;

    const fileObject: any = file instanceof FileInformation ? file.getFileInfo() : file;
    if (fileObject && fileObject.path) {
      this.handleFileInformation(fileObject);
      getFileIcon(fileObject.path, (err, icon) => {
        this.fileIcon = 'data:image/jpeg;base64, ' + icon.toJPEG(100).toString('base64');
      });
    } else if (file instanceof FileInformation) {
      const buffer = file.getFileBuffer();
      if (buffer && buffer.length > 0) {
        this.handleFileInformation({
          type: 'image/png',
          path: 'data:image/png;base64,' + buffer.toString('base64'),
          name: 'Clipboard File'
        });
      } else {
        this.handleFileInformation(undefined);
      }
    }

    this._changeDetector.markForCheck();
  }

}
