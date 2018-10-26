import { PostyBirbSubmissionModel, SubmissionArchive } from '../models/postybirb-submission-model';


// clean out unused things due to removing websites
export function _trimSubmissionFields(model: PostyBirbSubmissionModel, websites: string[] = []): PostyBirbSubmissionModel {
  const tagKeys = Object.keys(model.tagInfo || {});
  for (let i = 0; i < tagKeys.length; i++) {
    const key = tagKeys[i];

    if (key == 'default') continue;
    if (!websites.includes(key)) {
      delete model.tagInfo[key];
    }
  }

  const descriptionKeys = Object.keys(model.descriptionInfo || {});
  for (let i = 0; i < descriptionKeys.length; i++) {
    const key = descriptionKeys[i];

    if (key == 'default') continue;
    if (!websites.includes(key)) {
      delete model.descriptionInfo[key];
    }
  }

  const optionKeys = Object.keys(model.optionInfo || {});
  for (let i = 0; i < optionKeys.length; i++) {
    const key = optionKeys[i];

    if (key == 'default') continue;
    if (!websites.includes(key)) {
      delete model.optionInfo[key];
    }
  }

  return model;
}

export function _filelessSubmissionCopy(values: any, descriptionInfo: any, tagInfo: any, optionInfo: any): PostyBirbSubmissionModel {
  const fake: PostyBirbSubmissionModel = new PostyBirbSubmissionModel(null);
  fake.title = values.title;
  fake.rating = values.rating;
  fake.descriptionInfo = descriptionInfo;
  fake.tagInfo = tagInfo;
  fake.optionInfo = optionInfo;
  fake.unpostedWebsites = values.websites;
  fake.schedule = values.schedule;
  return fake;
}

export function _copySubmission(model: PostyBirbSubmissionModel): PostyBirbSubmissionModel {
  return PostyBirbSubmissionModel.fromArchive(model.asSubmissionArchive());
}
