import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

type DeleteQueryActionType = 'REDO' | 'UNDO' | 'DELETE' | 'HARD_DELETE';

export class DeleteQuery {
  @ApiProperty()
  ids: string[] | string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  action: DeleteQueryActionType;

  getIds(): string[] {
    return Array.isArray(this.ids) ? this.ids : [this.ids];
  }
}
