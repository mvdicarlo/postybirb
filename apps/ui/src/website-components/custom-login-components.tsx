import { LoginComponentProps } from '../models/login-component-props';

type CustomLoginComponentProviderFn = (
  props: LoginComponentProps
) => JSX.Element;

const CustomLoginComponents: Record<string, CustomLoginComponentProviderFn> =
  Object.freeze({});

export function getCustomLoginComponent(
  loginComponentName: string
): CustomLoginComponentProviderFn | undefined {
  return CustomLoginComponents[loginComponentName];
}
