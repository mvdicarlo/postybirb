import { Component, OnInit, OnDestroy, AfterContentInit, forwardRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteManagerService } from '../../../../../../commons/services/website-manager/website-manager.service';
import { Subscription } from 'rxjs';
import { SupportedWebsites } from '../../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'sofurry-folders',
  templateUrl: './sofurry-folders.component.html',
  styleUrls: ['./sofurry-folders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SofurryFoldersComponent),
      multi: true,
    }
  ]
})
export class SofurryFoldersComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, AfterContentInit, ControlValueAccessor {
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
    this.populateFolders(this.service.getOther(SupportedWebsites.SoFurry).folders);
    this.statusSubscription = this.service.getObserver().subscribe((statuses) => {
      if (statuses[SupportedWebsites.SoFurry]) {
        this.populateFolders(this.service.getOther(SupportedWebsites.SoFurry).folders);
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  populateFolders(folders: any): void {
    this.folders = [];
    if (folders) {
      this.folders = folders.map(folder => {
        return {
          value: folder.value,
          label: folder.name
        };
      });
    } else {
      this.value = '';
    }

    this._changeDetector.markForCheck();
  }

  public onChange(event: any) {
    this.onChangedCallback(event.value);
  }

}
