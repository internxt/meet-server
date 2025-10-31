import { Time } from './time';
import dayjs from 'dayjs';

describe('Time', () => {
  describe('now', () => {
    it('When no parameter is provided, then it should return current date in UTC', () => {
      const before = dayjs().utc().valueOf();
      const result = Time.now();
      const after = dayjs().utc().valueOf();

      expect(result).toBeInstanceOf(Date);
      expect(result.valueOf()).toBeGreaterThanOrEqual(before);
      expect(result.valueOf()).toBeLessThanOrEqual(after);
    });

    it('When a Date object is provided, then it should convert it to UTC', () => {
      const inputDate = Time.now('2024-01-15T10:30:00.000Z');
      const result = Time.now(inputDate);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('When a string date is provided, then it should convert it to UTC date', () => {
      const dateString = '2024-06-20T15:45:30.000Z';
      const result = Time.now(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(dateString);
    });

    it('When a timestamp number is provided, then it should convert it to UTC date', () => {
      const timestamp = 1719842400000; // 2024-07-01T12:00:00.000Z
      const result = Time.now(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result.valueOf()).toBe(timestamp);
    });
  });

  describe('dateWithTimeAdded', () => {
    it('When adding years, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-01T00:00:00.000Z');
      const result = Time.dateWithTimeAdded(2, 'year', initialDate);

      expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('When adding months, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-15T12:00:00.000Z');
      const result = Time.dateWithTimeAdded(3, 'month', initialDate);

      expect(result.toISOString()).toBe('2024-04-15T12:00:00.000Z');
    });

    it('When adding weeks, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-01T00:00:00.000Z');
      const result = Time.dateWithTimeAdded(2, 'week', initialDate);

      expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('When adding days, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-01T00:00:00.000Z');
      const result = Time.dateWithTimeAdded(10, 'day', initialDate);

      expect(result.toISOString()).toBe('2024-01-11T00:00:00.000Z');
    });

    it('When adding hours, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-01T10:00:00.000Z');
      const result = Time.dateWithTimeAdded(5, 'hour', initialDate);

      expect(result.toISOString()).toBe('2024-01-01T15:00:00.000Z');
    });

    it('When adding minutes, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-01T10:30:00.000Z');
      const result = Time.dateWithTimeAdded(45, 'minute', initialDate);

      expect(result.toISOString()).toBe('2024-01-01T11:15:00.000Z');
    });

    it('When adding seconds, then it should return correct date', () => {
      const initialDate = Time.now('2024-01-01T10:00:00.000Z');
      const result = Time.dateWithTimeAdded(30, 'second', initialDate);

      expect(result.toISOString()).toBe('2024-01-01T10:00:30.000Z');
    });

    it('When no initial date is provided, then it should add to current time', () => {
      const before = dayjs().utc().add(1, 'day');
      const result = Time.dateWithTimeAdded(1, 'day');
      const after = dayjs().utc().add(1, 'day');

      expect(result.valueOf()).toBeGreaterThanOrEqual(before.valueOf());
      expect(result.valueOf()).toBeLessThanOrEqual(after.valueOf());
    });

    it('When negative amount is provided, then it should subtract time', () => {
      const initialDate = Time.now('2024-01-10T00:00:00.000Z');
      const result = Time.dateWithTimeAdded(-5, 'day', initialDate);

      expect(result.toISOString()).toBe('2024-01-05T00:00:00.000Z');
    });
  });

  describe('isBefore', () => {
    it('When date is before provided current date, then it should return true', () => {
      const date = Time.now('2024-01-01T00:00:00.000Z');
      const currentDate = Time.now('2024-06-01T00:00:00.000Z');
      const result = Time.isBefore(date, currentDate);

      expect(result).toBe(true);
    });

    it('When date is after provided current date, then it should return false', () => {
      const date = Time.now('2024-06-01T00:00:00.000Z');
      const currentDate = Time.now('2024-01-01T00:00:00.000Z');
      const result = Time.isBefore(date, currentDate);

      expect(result).toBe(false);
    });

    it('When dates are equal, then it should return false', () => {
      const date = Time.now('2024-01-01T12:00:00.000Z');
      const currentDate = Time.now('2024-01-01T12:00:00.000Z');
      const result = Time.isBefore(date, currentDate);

      expect(result).toBe(false);
    });

    it('When date is 1 millisecond before, then it should return true', () => {
      const date = Time.now('2024-01-01T12:00:00.000Z');
      const currentDate = Time.now('2024-01-01T12:00:00.001Z');
      const result = Time.isBefore(date, currentDate);

      expect(result).toBe(true);
    });
  });
});
