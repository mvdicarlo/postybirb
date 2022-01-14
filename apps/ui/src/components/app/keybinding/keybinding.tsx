import { PropsWithChildren, useEffect } from 'react';
import tinykeys from 'tinykeys';
import './keybinding.css';

export type KeybindingProps = {
  keybinding: string;
  onActivate: (event: KeyboardEvent) => void;
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
      <span title={`Shortcut: ${keybinding}`} className="keybinding ml-1">
        {bindings}
      </span>
    </>
  );
}
