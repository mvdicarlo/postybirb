import { Component, OnInit, OnDestroy, AfterContentInit, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteManagerService } from '../../../../../commons/services/website-manager/website-manager.service';
import { Subscription } from 'rxjs';
import { SupportedWebsites } from '../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'furaffinity-folders',
  templateUrl: './furaffinity-folders.component.html',
  styleUrls: ['./furaffinity-folders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FuraffinityFoldersComponent),
      multi: true,
    }
  ]
})
export class FuraffinityFoldersComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, AfterContentInit, ControlValueAccessor {
  private statusSubscription: Subscription;
  public folders: any[];

  constructor(private service: WebsiteManagerService) {
    super();
  }

  ngOnInit() {
    this.value = [];
    this.folders = [];
  }

  ngAfterContentInit() {
    this.populateFolders(this.service.getInfo(SupportedWebsites.Furaffinity).folders);
    this.statusSubscription = this.service.getObserver().subscribe((statuses) => {
      if (statuses[SupportedWebsites.Furaffinity]) {
        this.populateFolders(this.service.getInfo(SupportedWebsites.Furaffinity).folders);
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  populateFolders(folders: any[]): void {
    this.folders = [];
    if (folders) {
      this.folders = folders;
    } else {
      this.value = [];
    }
  }

  public onChange(event: any) {
    this.onChangedCallback(event.value);
  }

}
