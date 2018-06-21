/**
 * @interface
 * Interface object for mocking a normal File object
 */
export interface FileObject {
  path: string;
  name: string;
  type: string;
  size: number;
}
