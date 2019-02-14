import { Submission } from 'src/app/database/models/submission.model';
import { TagData } from 'src/app/utils/components/tag-input/tag-input.component';
import { DescriptionData } from 'src/app/utils/components/description-input/description-input.component';
import { WebsiteRegistry } from '../registries/website.registry';
import { SubmissionType } from 'src/app/database/tables/submission.table';

export function validate(submission: Submission): string[] {
  const problems = [];

  if (!submission.rating) problems.push('Rating missing');
  if (submission.formData) {
    if (!(submission.formData.websites && submission.formData.websites.length)) {
      problems.push('No websites selected');
    }
    if (!submission.formData.loginProfile) {
      problems.push('Must select a login profile');
    }
  } else {
    problems.push('Incomplete submission');
  }

  return problems.sort();
}

export function getTags(submission: Submission, website: string): string[] {
  let tags = [];
  if (submission.formData && submission.formData.defaults && submission.formData.defaults.tags) {
    tags = submission.formData.defaults.tags.tags || [];
    if (submission.formData[website] && submission.formData[website].tags) {
      const customTags: TagData = submission.formData[website].tags;
      if (customTags.extend) {
        tags = [...tags, ...(customTags.tags || [])];
      } else {
        tags = (customTags.tags || []);
      }
    }
  }

  return tags;
}

export function getDescription(submission: Submission, website: string): string {
  let description = '';
  if (submission.formData && submission.formData.defaults && submission.formData.defaults.description) {
    description = (<DescriptionData>submission.formData.defaults.description).description;
    if (submission.formData[website] && submission.formData[website].description) {
      const customDescription: DescriptionData = submission.formData[website].description;
      if (customDescription.overwrite) {
        return customDescription.description;
      }
    }
  }

  return description;
}

export function getOptions(submission: Submission, website: string): any {
  let options = {};

  if (submission.formData && submission.formData[website]) {
    options = submission.formData[website];
  }

  return options;
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
