import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type ExtraOptions = {
  /**
   * Minimum date/time allowed (ISO string or Date)
   */
  min?: string | Date;
  /**
   * Maximum date/time allowed (ISO string or Date)
   */
  max?: string | Date;
  /**
   * Whether to show time picker (false = date only)
   * @default true
   */
  showTime?: boolean;
  /**
   * Date format string for display
   */
  format?: string;
};

export const DateTimeField = createFieldDecorator<string, ExtraOptions>(
  'datetime',
)({
  defaults: {
    defaultValue: '',
    formField: 'datetime',
    showTime: true,
  },
});
