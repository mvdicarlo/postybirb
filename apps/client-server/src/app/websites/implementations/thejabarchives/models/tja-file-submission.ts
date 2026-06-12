import { BaseWebsiteOptions, SelectField } from '@postybirb/types';

export class TJAFileSubmission extends BaseWebsiteOptions {
  @SelectField({
    label: 'gallery',
    section: 'website',
    options: [],
    populate: 'galleries',
  })
  galleryId: string = '';
}
