/**
 * An enumeration representing the types of schedules.
 * @enum {string}
 */
export enum ScheduleType {
  /**
   * Indicates no schedule.
   */
  NONE = 'NONE',
  /**
   * Indicates a single schedule occurrence.
   */
  SINGLE = 'SINGLE',
  /**
   * Indicates a recurring schedule occurrence.
   */
  RECURRING = 'RECURRING',
}
