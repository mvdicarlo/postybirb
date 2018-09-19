import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';

import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { WebsiteStatus } from '../../../commons/enums/website-status.enum';
import { BbCodeParse } from '../../../commons/helpers/bbcode-parse';
import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';
import { JournalPostDialogComponent } from '../../components/dialog/journal-post-dialog/journal-post-dialog.component';

import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material';
import { MatDialog } from '@angular/material';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'journal-birb-app',
  templateUrl: './journal-birb-app.component.html',
  styleUrls: ['./journal-birb-app.component.css']
})
export class JournalBirbAppComponent implements OnInit, OnDestroy {
  public websites: any = SupportedWebsites;
  public form: FormGroup;
  public tumblrForm: FormGroup;
  public supportedWebsites: any;
  public ckConfig: any;
  public separatorKeysCodes = [ENTER, COMMA];
  public estimatedDescriptionCount: number = 0;

  private readonly MAX_DESCRIPTION_LENGTH: number = 10000;
  private managerSubscription: Subscription;
  private offlineMap: Map<string, number>;
  private allowedWebsites: string[] = [
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

  constructor(fb: FormBuilder, private managerService: WebsiteManagerService, private dialog: MatDialog, private snackBar: MatSnackBar) {
    this.form = fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(1)]],
      selectedWebsites: [[], Validators.required],
      rating: ['General', Validators.required],
      tags: [[]]
    });

    this.tumblrForm = fb.group({
      blog: []
    });

    this.form.controls.description.valueChanges
      .pipe(debounce(() => timer(100))).subscribe(description => {
        this.updateEstimatedCharacterCount(description);
      });
  }

  ngOnInit() {
    this.supportedWebsites = {};

    this.ckConfig = {
      toolbar: [
        { name: 'Actions', items: ['NewPage', 'Undo', 'Redo'] },
        { name: 'Basic', items: ['Bold', 'Italic', 'Underline', 'Strike', 'Blockquote', '-', 'RemoveFormat'] },
        { name: 'Justify', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight'] },
        { name: 'Formatting', items: ['TextColor', 'FontSize'] },
        { name: 'Link', items: ['Link', 'Unlink'] }
      ],
      removePlugins: 'magicline,elementspath,dialogadvtab,div,filebrowser,flash,format,forms,horizontalrule,iframe,liststyle,pagebreak,showborders,stylescombo,templates',
      extraPlugins: 'panelbutton,bbcode,colorbutton,basicstyles,newpage,justify,font',
      disableObjectResizing: true,
      htmlEncodeOutput: true,
      removeButtons: ''
    };

    this.offlineMap = new Map<string, number>();
    this.handleWebsiteStatuses(this.managerService.getWebsiteStatuses());

    this.managerSubscription = this.managerService.getObserver().subscribe((statuses) => {
      this.handleWebsiteStatuses(statuses);
    });
  }

  ngOnDestroy() {
    if (this.managerService) this.managerSubscription.unsubscribe();
  }

  private handleWebsiteStatuses(statuses: any): void {
    const keys = Object.keys(statuses);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = statuses[key];
      if (value !== WebsiteStatus.Logged_In) {
        this.offlineMap.set(key, value);
      } else {
        this.offlineMap.delete(key);
      }
    }

    this.updateSupportedWebsites();
  }

  private updateEstimatedCharacterCount(description: string): void {
    this.estimatedDescriptionCount = BbCodeParse.guessBBCodeCount(description);
  }

  private updateSupportedWebsites(): void {
    const currentlySelectedWebsites: string[] = this.form.value.selectedWebsites || [];

    let offline: string[] = [];
    this.offlineMap.forEach((value, key) => offline.push(key));
    offline = offline.filter(website => this.allowedWebsites.includes(website));

    const online: string[] = this.allowedWebsites.filter(website => !offline.includes(website));
    const filteredSelections = currentlySelectedWebsites.filter(website => online.includes(website));
    this.form.controls.selectedWebsites.patchValue(filteredSelections);

    this.supportedWebsites = { offline, online };
  }

  public addAdvertisement(appendAd: boolean) {
    const currentDescription = this.form.controls.description;
    let currentValue = currentDescription.value;

    const message = '[url=http://www.postybirb.com]Posted using JournalBirb[/url]';
    const includes = currentValue.includes(message);

    if (appendAd && !includes) {
      currentDescription.setValue(`${currentValue}\n${message}`);
    } else {
      currentDescription.setValue(currentValue.replace(`\n${message}`, ''));
    }
  }

  public clearForm(): void {
    this.form.reset();
    this.form.controls.rating.patchValue('General');
    this.tumblrForm.reset();
  }

  public addTag(event: MatChipInputEvent): void {
    const existingTags = this.form.value.tags || [];
    if (event.value) {
      const tags = event.value.split(',');
      for (let i = 0; i < tags.length; i++) {
        const value = tags[i].trim();
        if (value.length >= 3 && !existingTags.includes(value)) {
          existingTags.push(value);
        }
      }

      this.form.controls.tags.patchValue(existingTags);
    }

    if (event.input) {
      event.input.value = '';
    }
  }

  public removeTag(tag: string): void {
    const tags = this.form.value.tags || [];
    const index: number = tags.indexOf(tag)
    if (index !== -1) {
      tags.splice(index, 1);
      this.form.controls.tags.patchValue(tags);
    }
  }

  public post(): void {
    if (this.form.valid) {
      const values = this.form.value;
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Post'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const data = {
            title: values.title,
            description: values.description,
            selectedWebsites: values.selectedWebsites,
            options: {
              [SupportedWebsites.Tumblr]: this.tumblrForm.value,
              rating: values.rating,
              tags: values.tags
            }
          };

          let postDialogRef = this.dialog.open(JournalPostDialogComponent, {
            disableClose: true,
            height: '90%',
            width: '90%',
            data
          });

          postDialogRef.afterClosed().subscribe(remaining => {
            if (remaining.length === 0) {
              this.clearForm();
              this.snackBar.open('Statuses successfully updated!', 'OK', { duration: 5000 });
            } else {
              this.form.controls.selectedWebsites.patchValue(remaining);
              this.snackBar.open('Failed to post to some websites', 'OK', { duration: 5000 });
            }
          });
        }
      });
    }
  }

}
