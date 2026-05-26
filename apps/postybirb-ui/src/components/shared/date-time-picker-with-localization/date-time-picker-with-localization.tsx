import { DateTimePicker, DateTimePickerProps, DayOfWeek } from '@mantine/dates';
import dayjs from 'dayjs';
import { useLocale } from '../../../hooks/use-locale';

type Props = Omit<DateTimePickerProps, 'onChange' | 'placeholder'> & {
  onChange(date: Date | null): void;
  placeholder?: Date;
};

export function DateTimePickerWithLocalization(props: Props) {
  const { startOfWeek, dayjsDateTimeFormat, hourCycle } = useLocale();
  const { onChange, valueFormat, placeholder } = props;
  const format = valueFormat ?? dayjsDateTimeFormat;

  return (
    <DateTimePicker
      highlightToday
      firstDayOfWeek={startOfWeek as DayOfWeek}
      valueFormat={format}
      timePickerProps={{ format: hourCycle === 'h12' ? '12h' : '24h' }}
      {...props}
      placeholder={placeholder ? dayjs(placeholder).format(format) : undefined}
      onChange={(value) => {
        if (value) {
          onChange(new Date(value));
        } else {
          onChange(null);
        }
      }}
    />
  );
}
