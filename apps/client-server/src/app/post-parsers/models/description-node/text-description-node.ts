/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { UsernameShortcut } from '@postybirb/types';
import { encode } from 'html-entities';
import { DescriptionNode } from './description-node.base';
import { IDescriptionTextNode, Styles } from './description-node.types';

export class DescriptionTextNode
  extends DescriptionNode<IDescriptionTextNode['type']>
  implements IDescriptionTextNode
{
  text: string;

  styles: Styles;

  constructor(
    website: string,
    node: IDescriptionTextNode,
    shortcuts: Record<string, UsernameShortcut>,
  ) {
    super(website, node, shortcuts);
    this.text = node.text ?? '';
    this.styles = node.styles ?? {};
  }

  toString(): string {
    return this.text;
  }

  toHtmlString(): string {
    const segments: string[] = [];
    const styles: string[] = [];

    if (this.text === undefined || this.text === null || this.text === '') {
      return '';
    }

    // This is to handle a merged block node
    if (this.text === '\n' || this.text === '\r\n') {
      return '<br>';
    }

    if (this.styles.bold) {
      segments.push('b');
    }

    if (this.styles.italic) {
      segments.push('i');
    }

    if (this.styles.underline) {
      segments.push('u');
    }

    if (this.styles.strike) {
      segments.push('s');
    }

    if (this.styles.textColor && this.styles.textColor !== 'default') {
      styles.push(`color: ${this.styles.textColor}`);
    }

    if (
      this.styles.backgroundColor &&
      this.styles.backgroundColor !== 'default'
    ) {
      styles.push(`background-color: ${this.styles.backgroundColor}`);
    }

    const text = encode(this.text, { level: 'html5' }).replace(/\n/g, '<br />');
    if (!segments.length && !styles.length) {
      return text;
    }

    const stylesString = styles.join(';');
    return `<span${
      stylesString.length ? ` styles="${stylesString}"` : ''
    }>${segments.map((s) => `<${s}>`).join('')}${text}${segments
      .reverse()
      .map((s) => `</${s}>`)
      .join('')}</span>`;
  }

  toBBCodeString(): string {
    const segments: string[] = [];

    if (this.text === undefined || this.text === null || this.text === '') {
      return '';
    }

    // This is to handle a merged block node
    if (this.text === '\n' || this.text === '\r\n') {
      return '[br]';
    }

    if (this.styles.bold) {
      segments.push('b');
    }

    if (this.styles.italic) {
      segments.push('i');
    }

    if (this.styles.underline) {
      segments.push('u');
    }

    if (this.styles.strike) {
      segments.push('s');
    }

    if (!segments.length) {
      return this.text;
    }

    const text = this.text.replace(/\n/g, '[br]');
    let segmentedText = `[${segments.join('')}][/${segments.reverse().join('')}][${text}]`;

    if (this.styles.textColor && this.styles.textColor !== 'default') {
      segmentedText = `[color=${this.styles.textColor}]${segmentedText}[/color]`;
    }

    return segmentedText;
  }
}
