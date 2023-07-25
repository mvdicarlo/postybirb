import { PropsWithChildren, useEffect } from 'react';
import tinykeys from 'tinykeys';
import './keybinding.css';

export type KeybindingProps = {
  keybinding: string;
  // eslint-disable-next-line react/no-unused-prop-types
  onActivate: (event: KeyboardEvent) => void;
  // eslint-disable-next-line react/no-unused-prop-types, react/require-default-props
  displayOnly?: boolean;
};

export function useKeybinding(props: KeybindingProps) {
  const { keybinding, onActivate, displayOnly } = props;

  useEffect(() => {
    const unsubscribe = displayOnly
      ? () => {}
      : tinykeys(window, {
          [keybinding]: onActivate,
        });

    return () => unsubscribe();
  });
}

export default function Keybinding(props: PropsWithChildren<KeybindingProps>) {
  useKeybinding(props);
  const { children, keybinding } = props;

  const bindings: JSX.Element[] = [];
  keybinding.split('+').forEach((binding, i) => {
    let keyName = binding;
    if (keyName === 'Control') {
      keyName = 'Ctrl';
    }

    if (i > 0) {
      bindings.push(<span>+</span>);
    }

    bindings.push(<kbd>{keyName}</kbd>);
  });

  return (
    <>
      {children}
      <span
        key={keybinding}
        title={`Shortcut: ${keybinding}`}
        className="keybinding ml-1"
      >
        {bindings}
      </span>
    </>
  );
}
