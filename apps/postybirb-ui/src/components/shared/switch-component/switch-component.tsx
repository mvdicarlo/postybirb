type Returnables = JSX.Element | null;

type SwitchComponentProps<
  T extends Record<string, Returnables> = Record<string, Returnables>,
> = {
  options: T;
  selected: keyof T;
};

export default function SwitchComponent(props: SwitchComponentProps) {
  return props.options[props.selected];
}
