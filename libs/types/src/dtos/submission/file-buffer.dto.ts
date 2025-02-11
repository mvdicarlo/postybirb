import { IFileBuffer } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type FileBufferDto = Omit<IEntityDto<IFileBuffer>, 'buffer'>;
