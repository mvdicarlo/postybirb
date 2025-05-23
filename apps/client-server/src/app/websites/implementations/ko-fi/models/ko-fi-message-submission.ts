import { SelectField } from '@postybirb/form-builder';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { KoFiAccountData } from './ko-fi-account-data';

export class KoFiMessageSubmission extends BaseWebsiteOptions {
  @SelectField<KoFiAccountData>({
    label: 'folder',
    options: [],
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
  })
  album?: string;

  @SelectField({
    label: 'audience',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'supporter', label: 'All Supporters (One-off & Monthly)' },
      {
        value: 'recurringSupporter',
        label: 'All Monthly Supporters (Members)',
      },
    ],
  })
  audience = 'public';
}
