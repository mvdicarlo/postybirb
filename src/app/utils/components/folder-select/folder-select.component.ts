import { Component, OnInit, Input } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseValueAccessor } from '../base-value-accessor/base-value-accessor';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'folder-select',
  templateUrl: './folder-select.component.html',
  styleUrls: ['./folder-select.component.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: FolderSelect,
    multi: true
  }],
  host: {
    'class': 'd-block'
  }
})
export class FolderSelect extends BaseValueAccessor implements OnInit, ControlValueAccessor {
  @Input() multiple: boolean = false;
  @Input() placeholder: string = 'Folder';
  @Input() folders: Folder[] = [];
  @Input() required: boolean = false;

  public selectControl: FormControl = new FormControl(null);

  constructor() {
    super();
  }

  ngOnInit() {
    this.selectControl.valueChanges.subscribe(folders => {
      this.onChange(folders);
    });
  }

  public onChange(folderIds: any): void {
    this.value = folderIds;
    this._onChange(folderIds);
  }

  public writeValue(folderIds: any): void {
    this.value = folderIds;
    this.selectControl.patchValue(folderIds);
  }

}
