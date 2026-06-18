import { SelectField } from '@postybirb/form-builder';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { TJAAccountData } from './tja-account-data';

export class TJAFileSubmission extends BaseWebsiteOptions {
  @SelectField<TJAAccountData>({
    required: true,
    label: 'folder',
    section: 'website',
    derive: [
      {
        key: 'galleries',
        populate: 'options',
      },
    ],
    options: [],
  })
  galleryId = '';
}
