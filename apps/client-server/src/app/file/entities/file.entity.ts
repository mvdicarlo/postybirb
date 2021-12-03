import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { IFile } from '../models/file.interface';
import { FileData } from './file-data.entity';

@Entity()
export class File implements IFile {
  @PrimaryColumn('uuid', { unique: true })
  id: string;

  @Column({ nullable: false })
  filename: string;

  @Column({ nullable: false })
  mimetype: string;

  @Column({ type: 'integer', nullable: false })
  size: number;

  @Column({ type: 'integer', nullable: true })
  height: number = 0;

  @Column({ type: 'integer', nullable: true })
  width: number = 0;

  @Column({ type: 'simple-array', nullable: false })
  modifiers: any[] = [];

  @Column({ nullable: false })
  hash: string;

  @OneToMany(() => FileData, (fileData) => fileData.file, {
    cascade: true,
  })
  data: Promise<FileData[]>;

  get file(): Promise<FileData | undefined> {
    return this.data?.then((files) => files[0]);
  }

  get thumbnail(): Promise<FileData | undefined> {
    return this.data?.then((files) => files[1]);
  }
}
