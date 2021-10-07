import { Column, Entity, PrimaryColumn } from 'typeorm';
import { SafeObject } from '../../shared/types/safe-object.type';

@Entity()
export class WebsiteData<T extends SafeObject> {
    @PrimaryColumn()
    id: string; 

    @Column("simple-json")
    data: T;
}
