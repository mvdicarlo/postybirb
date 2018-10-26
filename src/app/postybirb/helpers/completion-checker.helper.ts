import { TagRequirements } from '../models/website-tag-requirements.model';
import { OptionsForms } from '../models/website-options.model';
import { PostyBirbSubmissionModel } from '../models/postybirb-submission-model';
import { PostyBirbSubmissionData } from '../../commons/interfaces/posty-birb-submission-data.interface';

export function checkForCompletion(submission: PostyBirbSubmissionModel): boolean {
  const websites: string[] = submission.unpostedWebsites;
  if (!websites) return false;
  if (websites && websites.length === 0) return false;

  for (let i = 0; i < websites.length; i++) {
    const website = websites[i];
    const data: PostyBirbSubmissionData = submission.getAllForWebsite(website);

    const tagRequirements = TagRequirements[website];
    if (!tagRequirements.exclude && tagRequirements.minTags) {
      const tags = [...data.customTags, ...data.defaultTags];
      if (tags.length < tagRequirements.minTags) return false;
    }

    const optionRequirements = OptionsForms[website].requiredFields;
    if (optionRequirements) {
      for (let j = 0; j < optionRequirements.length; j++) {
        const requiredOption = optionRequirements[j];
        if (data.options[requiredOption] === null || data.options[requiredOption] === undefined) return false;
      }
    }
  }

  return true;
}
