/**
 * Utility for generating dynamic class names with conditional support.
 *
 * @example
 * // Basic usage with static classes
 * cn(['class1', 'class2']) // => "class1 class2"
 *
 * // With conditional classes
 * cn(['static-class'], { 'is-active': true, 'is-disabled': false })
 * // => "static-class is-active"
 *
 * // Only conditionals
 * cn({ 'is-collapsed': isCollapsed, 'is-expanded': !isCollapsed })
 *
 * // Mixed with undefined/null filtering
 * cn(['base', undefined, null, 'valid'], { 'conditional': true })
 * // => "base valid conditional"
 */

type ConditionalClasses = Record<string, boolean | undefined | null>;
type StaticClasses = (string | undefined | null)[];

/**
 * Generates a className string from static and conditional class names.
 *
 * @param staticOrConditional - Array of static class names, or conditional object if no statics
 * @param conditional - Object mapping class names to boolean conditions
 * @returns Combined className string
 */
export function cn(
  staticOrConditional: StaticClasses | ConditionalClasses,
  conditional?: ConditionalClasses,
): string {
  const classes: string[] = [];

  // Handle first argument
  if (Array.isArray(staticOrConditional)) {
    // It's an array of static classes
    for (const cls of staticOrConditional) {
      if (cls) {
        classes.push(cls);
      }
    }
  } else {
    // It's a conditional object (no static classes provided)
    for (const [cls, condition] of Object.entries(staticOrConditional)) {
      if (condition) {
        classes.push(cls);
      }
    }
  }

  // Handle conditional argument if provided
  if (conditional) {
    for (const [cls, condition] of Object.entries(conditional)) {
      if (condition) {
        classes.push(cls);
      }
    }
  }

  return classes.join(' ');
}
