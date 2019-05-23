import { Component, OnInit, forwardRef, Injector, AfterViewInit } from '@angular/core';
import { HOST_DATA, BaseWebsiteSubmissionForm } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { Validators } from '@angular/forms';
import { Discord } from '../../discord.service';

@Component({
  selector: 'discord-submission-form',
  templateUrl: './discord-submission-form.component.html',
  styleUrls: ['./discord-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => DiscordSubmissionForm) }],
  host: HOST_DATA
})
export class DiscordSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    webhooks: [[], Validators.required]
  };

  public webhooks: any = {};

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.webhooks = (<Discord>this.websiteService).getWebhooks();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
  }
}
