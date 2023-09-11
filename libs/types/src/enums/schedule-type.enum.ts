/**
 * An enumeration representing the types of schedules.
 * @enum {string}
 */
export enum ScheduleType {
  /**
   * Indicates no schedule.
   */
  NONE = 'none',
  /**
   * Indicates a single schedule occurrence.
   */
  SINGLE = 'single',
  /**
   * Indicates a recurring schedule occurrence.
   */
  RECURRING = 'recurring',
}
