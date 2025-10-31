import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export type TimeUnit =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second';

export class Time {
  public static now(initialDate?: string | Date | number) {
    return dayjs(initialDate).utc().toDate();
  }

  public static dateWithTimeAdded(
    amount: number,
    unit: TimeUnit,
    initialDate?: Date,
  ): Date {
    const date = dayjs(initialDate ?? Time.now()).utc();
    return date.add(amount, unit).toDate();
  }

  public static isBefore(date: Date, currentDate?: Date): boolean {
    const previousDate = dayjs(date).utc();
    return previousDate.isBefore(dayjs(currentDate || Time.now()).utc());
  }
}
