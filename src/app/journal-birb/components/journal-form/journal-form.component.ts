import { Component, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatDialog } from '@angular/material';
import { SnotifyService } from 'ng-snotify';

import { AdditionalOptionsComponent } from '../common/additional-options/additional-options.component';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { WebsiteStatusManager } from '../../../commons/helpers/website-status-manager';
import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';

import { AdditionalOptions } from '../../interfaces/additional-options.interface';
import { OptionsMap } from '../../enums/website-options-map.enum';
import { JournalPostDialogComponent } from '../../components/dialog/journal-post-dialog/journal-post-dialog.component';

@Component({
  selector: 'journal-form',
  templateUrl: './journal-form.component.html',
  styleUrls: ['./journal-form.component.css']
})
export class JournalFormComponent implements OnDestroy {
  public form: FormGroup;
  public supportedWebsites: string[] = [
    SupportedWebsites.DeviantArt,
    SupportedWebsites.Furaffinity,
    SupportedWebsites.Furiffic,
    SupportedWebsites.FurryNetwork,
    SupportedWebsites.Inkbunny,
    SupportedWebsites.Mastodon,
    SupportedWebsites.Patreon,
    SupportedWebsites.SoFurry,
    SupportedWebsites.Tumblr,
    SupportedWebsites.Twitter,
    SupportedWebsites.Weasyl
  ];

  public onlineWebsites: string[] = [];
  public offlineWebsites: string[] = [];
  public hasWebsitesWithTags: boolean = false;
  public defaultDescription: BehaviorSubject<any>;

  private websiteStatusSubscription = Subscription.EMPTY;
  private statusManager: WebsiteStatusManager;

  @ViewChildren(AdditionalOptionsComponent) customizableWebsites: QueryList<AdditionalOptionsComponent>;

  constructor(fb: FormBuilder, private websiteCoordinator: WebsiteCoordinatorService, private dialog: MatDialog, private snotify: SnotifyService) {
    this.statusManager = new WebsiteStatusManager(this.supportedWebsites);
    this.defaultDescription = new BehaviorSubject(undefined);

    this.form = fb.group({
      defaultDescription: [null, Validators.required],
      tags: [null],
      title: [null, [Validators.required, Validators.minLength(5)]],
      websites: [[], Validators.required],
      rating: ['General', Validators.required]
    });

    this.websiteStatusSubscription = websiteCoordinator.asObservable().pipe(debounceTime(250))
      .subscribe((statuses: any) => this._updateWebsiteStatuses(statuses));

    this.form.controls.defaultDescription.valueChanges.subscribe(value => this.defaultDescription.next(value));

    this.form.controls.websites.valueChanges.pipe(debounceTime(100))
      .subscribe((websites: string[]) => {
        if (websites &&
          (websites.includes(SupportedWebsites.Tumblr) ||
            websites.includes(SupportedWebsites.Weasyl) ||
            websites.includes(SupportedWebsites.Inkbunny) ||
            websites.includes(SupportedWebsites.SoFurry) ||
            websites.includes(SupportedWebsites.Furiffic))
        ) {
          this.hasWebsitesWithTags = true;
        } else {
          this.hasWebsitesWithTags = false;
        }
      });
  }

  ngOnDestroy() {
    this.websiteStatusSubscription.unsubscribe();
  }

  public clearForm(): void {
    this.form.reset();
    if (this.customizableWebsites) {
      this.customizableWebsites.forEach(form => form.clear());
    }
  }

  public post(): void {
    if (this.form.valid) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Post'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const values = this.form.value;

          const data = {
            title: values.title,
            description: values.defaultDescription,
            selectedWebsites: values.websites,
            tags: values.tags ? values.tags.tags : [],
            rating: values.rating,
            options: {}
          };

          this.customizableWebsites.forEach(website => {
            data.options[website.config.website] = website.values()
          });

          let postDialogRef = this.dialog.open(JournalPostDialogComponent, {
            disableClose: true,
            height: '90%',
            width: '90%',
            data
          });

          postDialogRef.afterClosed().subscribe(remaining => {
            if (remaining.length === 0) {
              this.clearForm();
              this.snotify.success('Statuses successfully updated!');
            } else {
              this.form.controls.selectedWebsites.patchValue(remaining);
              this.snotify.error('Failed to post to some websites')
            }
          });
        }
      });
    }
  }

  private _updateWebsiteStatuses(statuses: any): void {
    this.statusManager.update(statuses);
    const offline = this.statusManager.getOffline();
    const selected = (this.form.value.websites || []).filter(website => !offline.includes(website));
    this.form.controls.websites.patchValue(selected);

    this.offlineWebsites = this.statusManager.getOffline();
    this.onlineWebsites = this.statusManager.getOnline();
  }

  public getConfig(website: string): AdditionalOptions {
    return {
      website,
      optionsComponent: OptionsMap[website],
    }
  }

}
