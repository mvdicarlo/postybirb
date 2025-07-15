import { Trans } from '@lingui/macro';
import React from 'react';

// May be used for preview feature, still needs to have actual
// bbcode parser instead of this fast implementation

export function E621Dtext({ dtext }: { dtext: string }) {
  const text = dtext.slice(0, 1000).replaceAll('\n\r', '\n'); // Cut long text

  const elements: React.ReactNode[] = [];

  for (const line of text.split('\n')) {
    if (line) elements.push(<E621DtextLine line={line} />);
    elements.push(<br />);
  }

  if (dtext.length > text.length) {
    elements.push('...');
    elements.push(<Trans>and {dtext.length - text.length} more</Trans>);
  }

  return elements;
}

function E621DtextLine({ line }: { line: string }) {
  const tokens = line.split(/\[([^\]]+)\]([^[]+)\[([^\]]+)\]/);

  if (tokens.length === 1) return tokens[0];

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const text = tokens[i + 1];
    const next = tokens[i + 2];
    if (next === `/${token}`) {
      if (token === 'b') elements.push(<strong>{text}</strong>);
      if (token === 'i') elements.push(<i>{text}</i>);
      i += 2;
    } else elements.push(token);
  }

  return elements;
}
