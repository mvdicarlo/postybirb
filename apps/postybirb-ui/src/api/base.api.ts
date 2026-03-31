/* eslint-disable @typescript-eslint/ban-types */
import { EntityId } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

export class BaseApi<
  GetType,
  CreateType extends Object,
  UpdateType extends Object,
> {
  protected readonly client: HttpClient;

  constructor(basePath: string) {
    this.client = new HttpClient(basePath);
  }

  public get(id: EntityId) {
    return this.client.get<GetType>(id);
  }

  public getAll() {
    return this.client.get<Array<GetType>>();
  }

  public create(createDto: CreateType) {
    return this.client.post<GetType>('', createDto);
  }

  public update(id: EntityId, updateDto: UpdateType) {
    return this.client.patch<GetType>(id, updateDto);
  }

  public remove(ids: EntityId[]) {
    return this.client.delete<{ success: boolean }>('', {
      ids,
    });
  }
}
