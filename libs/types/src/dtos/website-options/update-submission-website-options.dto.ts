import { EntityId } from '../../models';
import { ICreateWebsiteOptionsDto } from './create-website-options.dto';

export type IUpdateSubmissionWebsiteOptionsDto = {
  remove?: EntityId[];
  add?: ICreateWebsiteOptionsDto[];
};
