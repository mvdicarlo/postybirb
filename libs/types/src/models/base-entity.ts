export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  markedForDeletion: boolean;
}
