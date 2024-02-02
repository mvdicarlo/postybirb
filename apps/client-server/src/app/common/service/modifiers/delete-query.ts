import { ApiProperty } from '@nestjs/swagger';

export class DeleteQuery {
  @ApiProperty()
  ids: string[] | string;

  getIds(): string[] {
    return Array.isArray(this.ids) ? this.ids : [this.ids];
  }
}
