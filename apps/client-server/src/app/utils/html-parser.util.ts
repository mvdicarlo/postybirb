import { NotFoundException } from '@nestjs/common';

export default class HtmlParserUtil {
  public static getInputValue(html: string, name: string, index = 0): string {
    // eslint-disable-next-line no-param-reassign
    index = index || 0;
    const inputs = (html.match(/<input.*?(\/)*>/gim) || [])
      .filter((input) => input.includes(`name="${name}"`))
      .map((input) => input.match(/value="(.*?)"/)[1]);

    const picked = inputs[index];
    if (!picked) {
      throw new NotFoundException(`Could not find form key: ${name}[${index}]`);
    }

    return picked;
  }
}
