import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

// ISO String
export type DateString = string;

type ExtraOptions = {
  /**
   * Minimum date/time allowed (ISO string or Date)
   */
  min?: DateString;
  /**
   * Maximum date/time allowed (ISO string or Date)
   */
  max?: DateString;
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
