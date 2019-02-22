import { Submission } from 'src/app/database/models/submission.model';
import { TagData } from 'src/app/utils/components/tag-input/tag-input.component';
import { DescriptionData } from 'src/app/utils/components/description-input/description-input.component';
import { WebsiteRegistry } from '../registries/website.registry';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import * as dotProp from 'dot-prop';

export function validate(submission: Submission): string[] {
  const problems = [];

  if (!submission.rating) problems.push(['Rating missing']);
  if (submission.formData) {
    if (!(submission.formData.websites && submission.formData.websites.length)) {
      problems.push(['No websites selected']);
    }
    if (!submission.formData.loginProfile) {
      problems.push(['Must select a login profile']);
    }
  } else {
    problems.push(['Incomplete submission']);
  }

  return problems.sort();
}

export function getTags(submission: Submission, website: string): string[] {
  let tags: string[] = dotProp.get(submission.formData, 'defaults.tags.tags', []);
  const customTags: TagData = dotProp.get(submission.formData, `${website}.tags`, { extend: true }) || { extend: true };
  if (customTags.extend) {
    tags = [...tags, ...(customTags.tags || [])];
  } else {
    tags = (customTags.tags || []);
  }

  return tags;
}

export function getDescription(submission: Submission, website: string): string {
  let description: string = dotProp.get(submission.formData, 'defaults.description.description', '');
  const customDescription: DescriptionData = dotProp.get(submission.formData, `${website}.description`, {}) || {};
  if (customDescription.overwrite) {
    return customDescription.description;
  }

  return description;
}

export function getOptions(submission: Submission, website: string): any {
  return dotProp.get(submission.formData, `${website}.options`, {});
}

export function getAllWebsiteValidatorsForWebsites(websites: string[], submissionType: SubmissionType): ((submission: Submission, formData: any) => string[])[] {
  const validatorFns = [];
  for (let i = 0; i < websites.length; i++) {
    const config = WebsiteRegistry.getConfigForRegistry(websites[i]).websiteConfig;
    if (submissionType === SubmissionType.SUBMISSION) {
      validatorFns.push(config.validators.submission)
    } else {
      validatorFns.push(config.validators.journal)
    }
  }

  return validatorFns;
}

export function supportsFileType(fileType: string, supportedFileTypes: string[]): boolean {
  const split = fileType.split('/')[1];
  for (let i = 0; i < supportedFileTypes.length; i++) {
      if (supportedFileTypes[i].includes(fileType) || supportedFileTypes[i].includes(split)) {
        return true;
      }
  }

  return false;
}
