import { Component, OnInit, AfterViewInit, Input, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FileInformation } from '../../models/file-information';
import { FileObject } from '../../interfaces/file-obect.interface';
import { BaseControlValueAccessorComponent } from '../base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileInputComponent),
      multi: true,
    }
  ]
})
/**
 * Crappy input component for files
 */
export class FileInputComponent extends BaseControlValueAccessorComponent implements OnInit, ControlValueAccessor, AfterViewInit {
  @Input() name: string; //Placeholder text
  @Input() required: boolean;
  @Input() maxFileSize: number; //max file size in bits
  @Input() accept: string; //file types to accept

  @ViewChild('fileInput') fakeInput: ElementRef;
  @ViewChild('realInput') realInput: ElementRef;

  public fileSizeOverLimit: boolean;
  public currentFileSize: number;
  public passingRequired: boolean;
  public file: any;

  constructor() {
    super();
  }

  ngOnInit() {
    this.currentFileSize = 0;
    this.accept = this.accept || '*';
    this.fileSizeOverLimit = false;
    this.passingRequired = false;
    this.file = new FileInformation(null, false);
  }

  ngAfterViewInit() {
    this.realInput.nativeElement['accept'] = this.accept;
  }

  /**
   * @function changeStateFromFile
   * @param {FileInformation} file - FileInformation Object to be used to update the input
   */
  private changeStateFromFile(file: FileInformation | FileObject): void {
    if (!file) {
      file = new FileInformation(null, false);
      this.realInput.nativeElement.value = '';
    } else if (file instanceof FileInformation) {
      if (!file.isValid()) {
        file = new FileInformation(null, false);
        this.realInput.nativeElement.value = '';
      }
    } else {
      // Assumes FileObject
      file = new FileInformation(file, false);
    }

    this.currentFileSize = file.getSizeAsMB();
    this.fileSizeOverLimit = this.currentFileSize > (this.maxFileSize / 1000000);
    this.passingRequired = file.isValid();

    this.fakeInput.nativeElement.value = file.getName() || '';

    this.file = file;
  }

  /**
   * @function changeFromInput
   * @param {Event} event - event fired from input [type=file]
   */
  public changeFromInput(event: any): void {
    const files = event.target.files;
    this.onChange(new FileInformation(files.length ? files[0] : null, false));
  }

  public writeValue(file: FileInformation | FileObject) {
    this.changeStateFromFile(file);
  }

  public onChange(file: FileInformation) {
    this.changeStateFromFile(file);
    this.onChangedCallback(file);
  }

}
