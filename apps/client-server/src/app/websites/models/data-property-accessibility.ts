export type DataPropertyAccessibility<T> = {
  [key in keyof T]: boolean;
};
