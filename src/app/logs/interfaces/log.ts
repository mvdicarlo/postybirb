import { LogType } from '../enums/log-type.enum';

export interface Log {
  time: Date;
  level: LogType;
  data: any;
  reason?: string;
}
