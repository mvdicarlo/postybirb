import { Component, Injector, OnInit, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';
import { WebsiteCoordinatorService } from '../../../../commons/services/website-coordinator/website-coordinator.service';

@Component({
  selector: 'furry-amino-form',
  templateUrl: './furry-amino-form.component.html',
  styleUrls: ['./furry-amino-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => FurryAminoFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurryAminoFormComponent extends BaseOptionForm implements OnInit {
  public categories: any[] = [];

  constructor(injector: Injector, private coordinator: WebsiteCoordinatorService) {
    super(injector);
    this.website = this.supportedWebsites.FurryAmino;

    this.setOptionsForm({
      categories: [[]]
    });
  }

  ngOnInit() {
    this.categories = this.coordinator.getInfo(this.website).categories;
  }

}
