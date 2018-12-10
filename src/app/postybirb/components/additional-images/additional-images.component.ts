import { Component, OnInit, Input, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { FileInformation } from '../../../commons/models/file-information';

@Component({
  selector: 'additional-images',
  templateUrl: './additional-images.component.html',
  styleUrls: ['./additional-images.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdditionalImagesComponent implements OnInit {
  @Input() submission: PostyBirbSubmissionModel;
  @ViewChild('file') fileInput: ElementRef;

  public additionalFiles: FileInformation[] = [];

  constructor(private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this._load();
  }

  private _load(): void {
    this.additionalFiles = this.submission.getAdditionalFilesFileInformation();
    this._changeDetector.markForCheck();
  }

  public async addFile(event: Event) {
    event.stopPropagation();
    const files: File[] = event.target['files'];

    const convertedList: FileInformation[] = [];
    for (let i = 0; i < files.length; i++) {
      convertedList.push(new FileInformation(files[i], false));
    }

    this.submission.addAdditionalFiles(convertedList);
    this.fileInput.nativeElement.value = '';

    this._load();
  }

  public async moveUp(img: FileInformation) {
    let index = this.additionalFiles.indexOf(img);
    if (index !== 0) {
      index -= 1;
      const original = this.additionalFiles[index];
      this.additionalFiles[index] = img;
      this.additionalFiles[index + 1] = original;
    }

    this.submission.setAdditionalFiles(this.additionalFiles);
  }

  public async moveDown(img: FileInformation) {
    let index = this.additionalFiles.indexOf(img);
    if (index !== this.additionalFiles.length - 1) {
      index += 1;
      const original = this.additionalFiles[index];
      this.additionalFiles[index] = img;
      this.additionalFiles[index - 1] = original;
    }

    this.submission.setAdditionalFiles(this.additionalFiles);
  }

  public async delete(img: FileInformation) {
    let index = this.additionalFiles.indexOf(img);
    if (index !== -1) {
      this.additionalFiles.splice(index, 1);
      this.submission.setAdditionalFiles(this.additionalFiles);
      this._load();
    }
  }

}
