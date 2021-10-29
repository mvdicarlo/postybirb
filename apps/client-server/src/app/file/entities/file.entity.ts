import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { IFile } from '../models/file.interface';
import { FileData } from './file-data.entity';

@Entity()
@Unique(['id'])
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

  @OneToOne(() => File, (file) => file.id, {
    cascade: true,
    lazy: true,
    createForeignKeyConstraints: false
  })
  @JoinColumn({ referencedColumnName: 'id' })
  thumbnail: Promise<File | undefined>;

  @OneToOne(() => FileData, {
    cascade: true,
    lazy: true,
  })
  @JoinColumn()
  data: Promise<FileData>;
}
