import { Component, OnInit, Inject, Injector, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { Discord, DiscordWebhook } from '../../discord.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'discord-login-dialog',
  templateUrl: './discord-login-dialog.component.html',
  styleUrls: ['./discord-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class DiscordLoginDialog implements OnInit {
  public webhooks: DiscordWebhook[] = [];
  public webhookForm: FormGroup;
  private discord: Discord;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    private fb: FormBuilder,
    private _changeDetector: ChangeDetectorRef,
    injector: Injector
  ) {
    this.discord = injector.get(WebsiteRegistry.getConfigForRegistry('Discord').class); // avoid circ dep constructor issue
  }

  ngOnInit() {
    this.webhookForm = this.fb.group({
      name: ['', Validators.required],
      webhook: ['', Validators.required]
    });

    this.webhooks = this.discord.getWebhooks();
    this._changeDetector.markForCheck();
  }

  public addWebhook(): void {
    if (this.webhookForm.valid) {
      const webhook = this.webhookForm.value;
      const success = this.discord.addWebhook(Object.assign({}, webhook));
      if (!success) alert('Cannot add duplicate webhook');
      else this.webhookForm.reset();

      this.webhooks = this.discord.getWebhooks();
      this._changeDetector.markForCheck();
    }
  }

  public removeWebhook(webhookURL: string): void {
    this.discord.removeWebhook(webhookURL);
    this.webhooks = this.discord.getWebhooks();
    this._changeDetector.markForCheck();
  }

  public openHelp(event: Event): void {
    event.preventDefault();
    openUrlInBrowser('https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks');
  }

}
