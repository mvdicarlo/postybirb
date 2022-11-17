import { PrimitiveRecord } from './primitive-record';

export type FieldType<T extends PrimitiveRecord, V, F extends string> = {
  defaultFrom?: keyof T;
  defaultValue: V;
  enableWhenDefined?: Array<keyof T>;
  enableWhenUndefined?: Array<keyof T>;
  formField?: F;
  label: string;
  i18nLabel?: string;
  required?: boolean;
  type?: string;
};
