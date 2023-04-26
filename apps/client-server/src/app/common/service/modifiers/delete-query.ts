import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PostyBirbCRUDService } from '../postybirb-crud-service';

type DeleteQueryActionType = 'REDO' | 'UNDO' | 'DELETE' | 'HARD_DELETE';

export class DeleteQuery {
  @ApiProperty()
  ids: string[] | string;

  @ApiProperty()
  @IsOptional()
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
        return service
          .unmarkForDeletion(
            await service.find(
              {
                id: { $in: Array.isArray(query.ids) ? query.ids : [query.ids] },
              },
              undefined,
              true
            )
          )
          .then(() => ({
            success: true,
          }))
          .catch(() => ({
            success: false,
          }));
      case 'DELETE':
      case 'REDO':
        return service
          .markForDeletion(
            await service.find(
              {
                id: { $in: Array.isArray(query.ids) ? query.ids : [query.ids] },
              },
              undefined,
              true
            )
          )
          .then(() => ({
            success: true,
          }))
          .catch(() => ({
            success: false,
          }));
      case 'HARD_DELETE':
      default:
        return Promise.all(
          (Array.isArray(query.ids) ? query.ids : [query.ids]).map((id) =>
            service.remove(id)
          )
        )
          .then(() => ({
            success: true,
          }))
          .catch(() => ({
            success: false,
          }));
    }
  }
}
