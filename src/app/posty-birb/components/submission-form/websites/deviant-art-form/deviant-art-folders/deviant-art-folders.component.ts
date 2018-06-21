import { Component, OnInit, OnDestroy, AfterContentInit, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteManagerService } from '../../../../../../commons/services/website-manager/website-manager.service';
import { Subscription } from 'rxjs/Subscription';
import { SupportedWebsites } from '../../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'deviant-art-folders',
  templateUrl: './deviant-art-folders.component.html',
  styleUrls: ['./deviant-art-folders.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DeviantArtFoldersComponent),
      multi: true,
    }
  ]
})
export class DeviantArtFoldersComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, AfterContentInit, ControlValueAccessor {
  private statusSubscription: Subscription;
  public value: any[];
  public folders: any[];

  constructor(private service: WebsiteManagerService) {
    super();
  }

  ngOnInit() {
    this.value = [];
    this.folders = [];
  }

  ngAfterContentInit() {
    this.populateFolders(this.service.getOther(SupportedWebsites.DeviantArt).folders);
    this.statusSubscription = this.service.getObserver().subscribe((statuses) => {
      if (statuses[SupportedWebsites.DeviantArt]) {
        this.populateFolders(this.service.getOther(SupportedWebsites.DeviantArt).folders);
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  populateFolders(folders: any): void {
    this.folders = [];
    if (folders) {
      folders.forEach((folder) => {
        let parentName = null;

        folders.forEach((f) => {
          if (f.folderid === folder.parent && f.name !== 'Featured') {
            parentName = f.name;
          }
        });

        let label = folder.name;
        if (parentName) {
          label = `${parentName} / ${label}`;
        }

        const folderItem = {
          value: folder.folderid,
          label: label
        };

        this.folders.push(folderItem);
      });
    } else {
      this.value = [];
    }
  }

  public writeValue(obj: any[]) {
    if (obj) {
      this.value = obj;
    }
  }

  public onChange(event: any): void {
    this.onChangedCallback(event.value);
  }

}
