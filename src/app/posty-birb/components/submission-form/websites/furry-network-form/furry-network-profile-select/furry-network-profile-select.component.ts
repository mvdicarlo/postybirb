import { Component, OnInit, AfterContentInit, OnDestroy, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteManagerService } from '../../../../../../commons/services/website-manager/website-manager.service';
import { Subscription } from 'rxjs/Subscription';
import { SupportedWebsites } from '../../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'furry-network-profile-select',
  templateUrl: './furry-network-profile-select.component.html',
  styleUrls: ['./furry-network-profile-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FurryNetworkProfileSelectComponent),
      multi: true,
    }
  ]
})
export class FurryNetworkProfileSelectComponent extends BaseControlValueAccessorComponent implements OnInit, AfterContentInit, OnDestroy, ControlValueAccessor {
  private statusSubscription: Subscription;
  public profiles: any[];

  constructor(private service: WebsiteManagerService) {
    super();
  }

  ngOnInit() {
    this.value = undefined;
    this.profiles = [];
  }

  ngAfterContentInit() {
    this.populateProfiles(this.service.getOther(SupportedWebsites.FurryNetwork));
    this.statusSubscription = this.service.getObserver().subscribe((statuses) => {
      if (statuses[SupportedWebsites.FurryNetwork]) {
        this.populateProfiles(this.service.getOther(SupportedWebsites.FurryNetwork));
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  populateProfiles(info: any): void {
    if (info.characters && info.characters.length > 0) {
      this.profiles = info.characters.map((character) => {
        return {
          label: character.name,
          value: character.name
        };
      });

      if (!this.value) {
        this.value = info.characters[0].name;
        this.onChange({ value: this.value });
      }
    } else {
      this.profiles = [];
    }
  }

  public writeValue(obj: any) {
    if (obj) {
      this.value = obj;
    }
  }

  public onChange(event: any) {
    this.onChangedCallback(event.value);
  }
}
