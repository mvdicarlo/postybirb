import { EntityId } from '../../models';

export interface IReorderSubmissionFilesDto {
  order: Record<EntityId, number>;
}
