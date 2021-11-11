import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { IFileData } from '../models/file-data.interface';
import { File } from './file.entity';

@Entity()
export class FileData implements IFileData {
  @PrimaryColumn('uuid', { unique: true })
  id: string;

  @Column({ type: 'blob', nullable: false })
  buffer: Buffer;

  @ManyToOne(() => File, (file) => file.data, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  file: File;

  @Column({ type: 'integer', nullable: true })
  height: number;

  @Column({ type: 'integer', nullable: true })
  width: number;

  @Column({ nullable: false })
  mimetype: string;

  @Column({ nullable: false })
  filename: string;
}
