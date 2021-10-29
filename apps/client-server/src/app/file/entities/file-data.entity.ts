import { Column, Entity, PrimaryColumn } from 'typeorm';
import { IFileData } from '../models/file-data.interface';

@Entity()
export class FileData implements IFileData {
  @PrimaryColumn({ nullable: false, unique: true })
  id: string;

  @Column({ type: 'blob', nullable: false })
  data: Buffer;
}
