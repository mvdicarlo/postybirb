import { Component, OnInit, OnDestroy, AfterContentInit, forwardRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteManagerService } from '../../../../../../commons/services/website-manager/website-manager.service';
import { Subscription } from 'rxjs';
import { SupportedWebsites } from '../../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'weasyl-folders',
  templateUrl: './weasyl-folders.component.html',
  styleUrls: ['./weasyl-folders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WeasylFoldersComponent),
      multi: true,
    }
  ]
})
export class WeasylFoldersComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, AfterContentInit, ControlValueAccessor {
  private statusSubscription: Subscription;
  public folders: any[];

  constructor(private service: WebsiteManagerService, private _changeDetector: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    this.value = '';
    this.folders = [];
  }

  ngAfterContentInit() {
    this.populateFolders(this.service.getOther(SupportedWebsites.Weasyl).folders);
    this.statusSubscription = this.service.getObserver().subscribe((statuses) => {
      if (statuses[SupportedWebsites.Weasyl]) {
        this.populateFolders(this.service.getOther(SupportedWebsites.Weasyl).folders);
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  populateFolders(folders: any): void {
    this.folders = [];
    if (folders) {
      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        const folderItem = {
          value: folder.folder_id,
          label: folder.title
        };

        this.folders.push(folderItem);

        if (folder.subfolders) {
          for (let j = 0; j < folder.subfolders.length; j++) {
            const innerFolder = folder.subfolders[j];
            const subFolderItem = {
              value: innerFolder.folder_id,
              label: `${folder.title} / ${innerFolder.title}`
            };
            this.folders.push(subFolderItem);
          }
        }
      }
    } else {
      this.value = '';
    }

    this._changeDetector.markForCheck();
  }

  public onChange(event: any) {
    this.onChangedCallback(event.value);
  }

}
