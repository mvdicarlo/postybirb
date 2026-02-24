import { Trans } from '@lingui/react/macro';
import React from 'react';

// May be used for preview feature, still needs to have actual
// bbcode parser instead of this fast implementation

export function E621Dtext({ dtext }: { dtext: string }) {
  const text = dtext.slice(0, 1000).replaceAll('\n\r', '\n'); // Cut long text

  const elements: React.ReactNode[] = [];

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line) elements.push(<E621DtextLine key={`line-${i}`} line={line} />);
    elements.push(<br key={`br-${i}`} />);
  }

  if (dtext.length > text.length) {
    elements.push(<React.Fragment key="ellipsis">...</React.Fragment>);
    elements.push(
      <Trans key="more">and {dtext.length - text.length} more</Trans>,
    );
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
      if (token === 'b') elements.push(<strong key={`b-${i}`}>{text}</strong>);
      if (token === 'i') elements.push(<i key={`i-${i}`}>{text}</i>);
      i += 2;
    } else
      elements.push(<React.Fragment key={`t-${i}`}>{token}</React.Fragment>);
  }

  return elements;
}
