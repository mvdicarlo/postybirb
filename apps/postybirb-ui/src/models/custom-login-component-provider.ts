import { LoginComponentProps } from './login-component-props';

export type CustomLoginComponentProvider<T> = (
  props: LoginComponentProps<T>,
) => JSX.Element;
