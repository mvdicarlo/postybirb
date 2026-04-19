import { DateTimePicker, DateTimePickerProps, DayOfWeek } from '@mantine/dates';
import dayjs from 'dayjs';
import { useLocale } from '../../../hooks/use-locale.js';

type Props = Omit<DateTimePickerProps, 'onChange'> & {
  onChange(date: Date | null): void;
};

export function DateTimePickerWithLocalization(props: Props) {
  const { startOfWeek, dayjsDateTimeFormat, hourCycle } = useLocale();
  const { onChange, valueFormat } = props;
  const format = valueFormat ?? dayjsDateTimeFormat;

  return (
    <DateTimePicker
      highlightToday
      firstDayOfWeek={startOfWeek as DayOfWeek}
      valueFormat={format}
      timePickerProps={{ format: hourCycle === 'h12' ? '12h' : '24h' }}
      {...props}
      onChange={(value) => {
        if (value) {
          onChange(dayjs(value, format).toDate());
        } else {
          onChange(null);
        }
      }}
    />
  );
}
