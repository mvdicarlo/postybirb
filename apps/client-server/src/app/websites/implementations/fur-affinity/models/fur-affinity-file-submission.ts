import { TextField } from '@postybirb/form-builder';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class FurAffinityFileSubmission extends BaseWebsiteOptions {
  @TextField({ label: 'title', maxLength: 60 })
  title: string;
}
