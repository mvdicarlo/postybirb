import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PostyBirbCRUDService } from '../postybirb-crud-service';

type DeleteQueryActionType = 'REDO' | 'UNDO' | 'DELETE' | 'HARD_DELETE';

export class DeleteQuery {
  @ApiProperty()
  ids: string[] | string;

  @ApiProperty()
  @IsString()
  action: DeleteQueryActionType;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async execute<T extends PostyBirbCRUDService<any>>(
    query: DeleteQuery,
    service: T
  ) {
    // eslint-disable-next-line default-case
    switch (query.action) {
      case 'UNDO':
        return service.unmarkForDeletion(
          await service.find(
            {
              id: { $in: Array.isArray(query.ids) ? query.ids : [query.ids] },
            },
            undefined,
            true
          )
        );
      case 'HARD_DELETE':
        return Promise.all(
          (Array.isArray(query.ids) ? query.ids : [query.ids]).map((id) =>
            service.remove(id)
          )
        );
      case 'DELETE':
      case 'REDO':
      default:
        return service.markForDeletion(
          await service.find(
            {
              id: { $in: Array.isArray(query.ids) ? query.ids : [query.ids] },
            },
            undefined,
            true
          )
        );
    }
  }
}
