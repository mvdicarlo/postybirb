import { WebsiteRegistry } from '../registries/website.registry';
import { GenericLoginDialog } from '../components/generic-login-dialog/generic-login-dialog.component';
import { BaseWebsiteSubmissionForm } from '../components/base-website-submission-form/base-website-submission-form.component';
import { Type } from '@angular/core';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';

export interface WebsiteConfig {
  acceptsSrcURL?: boolean; // Whether or not this website uses Source Url options. This will stall a website from posting so that other websites may post and provide src urls
  additionalFiles?: boolean; // Whether or not additional files are allowed to be added to the submission form [default=false]
  displayedName?: string;        // name value that is displayed in the UI to the user [default=constructor name]
  postWaitInterval?: number; // interval to wait (in ms) between posts to this website
  refreshInterval?: number;     // interval at which the app will check status [default=30 minutes]
  refreshBeforePost?: boolean;  // if the website should try to refresh cookies/tokens or whatever before trying to post
  components: {
    submissionForm: Type<BaseWebsiteSubmissionForm>,
    journalForm?: Type<BaseWebsiteSubmissionForm>
  };
  login: { // login dialog information
    dialog?: any; // dialog component
    url: string;
  };
  preparsers?: {
    description?: ((html: string) => string)[]; // A list of parsers that occur before any other parsing
  };
  parsers?: {
    description: ((html: string) => string)[]; // A list of parsers
    disableAdvertise?: boolean; // Setting this to true will disallow Ad string to be added
    usernameShortcut?: {
      code: string; // e.g. fa -> would parse :falemonynade:
      url: string; // e.g. https://www.furaffinity.net/user/$1
      convertCodeTo?: string; // This will convert codes that go to the same website. e.g. Fur Affinity :fa: -> :icon: if convertCodeTo = icon (only applies to direct map so only triggers when sending to same website)
    };
  };
  validators: {
    warningCheck?: (submission: Submission, formData: SubmissionFormData) => string; // simple warning generator - should return website name
    submission?: (submission: Submission, formData: SubmissionFormData) => any[]; // in format [[string, ValidationProblem], ...]
    journal?: (submission: Submission, formData: SubmissionFormData) => any[];
  };
}

export function Website(websiteConfig: WebsiteConfig) {
  if (!websiteConfig.refreshInterval) websiteConfig.refreshInterval = 30 * 60000;
  if (!websiteConfig.login.dialog) websiteConfig.login.dialog = GenericLoginDialog;

  return (target: Function) => {
    if (!websiteConfig.displayedName) websiteConfig.displayedName = target.name;
    WebsiteRegistry.set(target, websiteConfig);
  }
}
