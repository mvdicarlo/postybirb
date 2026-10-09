import { DateTimePicker, DateTimePickerProps, DayOfWeek } from '@mantine/dates';
import dayjs from 'dayjs';
import { getDayjsDateTimeFormat } from '../../../hooks/locale-utils';
import { useLocale } from '../../../hooks/use-locale';

type Props = Omit<DateTimePickerProps, 'onChange' | 'placeholder'> & {
  onChange(date: Date | null): void;
  placeholder?: Date;
};

export function DateTimePickerWithLocalization(props: Props) {
  const { startOfWeek, regionalLocale, hourCycle, dateLocale, amPmLabels } =
    useLocale();
  const { onChange, value, valueFormat, placeholder, timePickerProps } = props;
  const getFormat = (date?: Date | string | null) =>
    valueFormat ??
    getDayjsDateTimeFormat(
      regionalLocale,
      hourCycle,
      date && dayjs(date).hour() >= 12 ? amPmLabels.pm : amPmLabels.am,
    );

  return (
    <DateTimePicker
      key={`${hourCycle}-${amPmLabels.am}-${amPmLabels.pm}`}
      highlightToday
      firstDayOfWeek={startOfWeek as DayOfWeek}
      {...props}
      valueFormat={getFormat(value)}
      locale={dateLocale}
      timePickerProps={{
        ...timePickerProps,
        format: hourCycle === 'h12' ? '12h' : '24h',
        amPmLabels,
      }}
      placeholder={
        placeholder
          ? dayjs(placeholder).locale(dateLocale).format(getFormat(placeholder))
          : undefined
      }
      onChange={(nextValue) => {
        if (nextValue) {
          onChange(new Date(nextValue));
        } else {
          onChange(null);
        }
      }}
    />
  );
}
