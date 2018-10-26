import { Component, OnInit, OnDestroy, AfterContentInit, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteCoordinatorService } from '../../../../../commons/services/website-coordinator/website-coordinator.service';
import { Subscription } from 'rxjs';
import { SupportedWebsites } from '../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'deviant-art-folders',
  templateUrl: './deviant-art-folders.component.html',
  styleUrls: ['./deviant-art-folders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  constructor(private service: WebsiteCoordinatorService, private _changeDetector: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    this.value = [];
    this.folders = [];
  }

  ngAfterContentInit() {
    this.populateFolders(this.service.getInfo(SupportedWebsites.DeviantArt).folders);
    this.statusSubscription = this.service.asObservable().subscribe((statuses) => {
      if (statuses[SupportedWebsites.DeviantArt]) {
        this.populateFolders(this.service.getInfo(SupportedWebsites.DeviantArt).folders);
        this._changeDetector.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  private populateFolders(folders: any): void {
    this.folders = [];
    if (folders) {
      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        let parentName = null;

        for (let j = 0; j < folders.length; j++) {
          const f = folders[j];
          if (f.folderid === folder.parent && f.name !== 'Featured') {
            parentName = f.name;
          }
        }

        let label = folder.name;
        if (parentName) {
          label = `${parentName} / ${label}`;
        }

        const folderItem = {
          value: folder.folderid,
          label: label
        };

        this.folders.push(folderItem);
      }
    } else {
      this.value = [];
    }
  }

  public writeValue(obj: any[] = []) {
    if (obj) {
      this.value = obj;
    }

    this._changeDetector.markForCheck();
  }

  public onChange(event: any): void {
    this.onChangedCallback(event.value);
  }

}
