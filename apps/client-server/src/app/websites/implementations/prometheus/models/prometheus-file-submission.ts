import {
  BooleanField,
  DescriptionField,
  SelectField,
  TextField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  PrometheusAccountData,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PrometheusFileSubmission extends BaseWebsiteOptions {
  @TitleField({ required: false, maxLength: 200 })
  declare title: string;

  @DescriptionField({
    required: false,
    maxDescriptionLength: 10000,
    descriptionType: DescriptionType.BBCODE,
  })
  declare description: DescriptionValue;

  @SelectField<PrometheusAccountData>({
    label: 'folder',
    allowMultiple: true,
    options: [],
    derive: [{ key: 'folders', populate: 'options' }],
    section: 'website',
    span: 6,
  })
  folders: string[] = [];

  @SelectField<PrometheusAccountData>({
    label: { untranslated: 'Pools' },
    allowMultiple: true,
    options: [],
    derive: [{ key: 'pools', populate: 'options' }],
    section: 'website',
    span: 6,
  })
  pools: string[] = [];

  @SelectField({
    label: { untranslated: 'Visibility' },
    defaultValue: 'inherit',
    options: [
      { value: 'inherit', label: 'Inherit from folders' },
      { value: 'public', label: 'Public' },
      { value: 'private', label: 'Private' },
      { value: 'password', label: 'Password' },
      { value: 'whitelist_proof', label: 'Whitelist proof' },
    ],
    section: 'website',
    span: 6,
  })
  visibility: string;

  @BooleanField({
    label: { untranslated: 'Display on gallery' },
    defaultValue: true,
    section: 'website',
    span: 6,
  })
  displayOnGallery: boolean;

  @TextField({
    label: { untranslated: 'Entry password' },
    showWhen: [['visibility', ['password']]],
    section: 'website',
    span: 12,
  })
  accessPassword = '';

  @TextField({
    label: 'contentWarning',
    hidden: false,
    formField: 'textarea',
    maxLength: 1000,
  })
  declare contentWarning: string;

  @TextField({
    label: { untranslated: 'Parent entry ID' },
    maxLength: 32,
    section: 'website',
    span: 12,
  })
  subEntryOf = '';
}
