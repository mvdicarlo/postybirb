/**
 * This class is primarily for pulling things out in a stupid way because I'm no good at regex from HTML text
 */
export class HTMLParser {
  /**
    * @function getInputValue
    * @static
    * @description Tries to grab a value an input from html text given a key name (legacy code from old postybirb)
    * @param {string} html - html string gotten from ajax/get call
    * @param {string} keyName - element name
    * @param {number} index - which element index
    * @return {string} - key value
    */
  public static getInputValue(html: string, keyName: string, index: number = 0): string {
    try {
      const elements = html.match(/<input.*?(?=\>)/g) || [];
      if (elements.length > 0) {
        let count: number = 0;
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (element.includes(`name="${keyName}"`)) {
            if (index !== count) {
              count += 1;
              continue;
            }

            const value = element.match(/value=".*?(?=")/g)[0];
            return value.replace('value="', '');
          }
        }
      } else {
        return ''
      };
      // const keyElement = html.match(new RegExp(`<input.*name="${keyName}".*?(?=\>)`, 'g'));
      // const value = keyElement[index].trim().match(/value=".*"/)[0].split('"')[1] || '';
      // return value;
    } catch (e) {
      return '';
    }
  }

  /**
   * @function getTagsOf
   * @static
   * @description Tries to get all elements of passed in tag in html text
   * @param {string} html - html text to be extracted from
   * @param {string} tagName - the tag to be pulled
   * @return {string[]} - returns all found tags matching passed in tag name
   */
  public static getTagsOf(html: string, tagName: string): string[] {
    try {
      const keyElement = html.match(new RegExp(`<${tagName}.*?(?=>)`, 'g'));
      return keyElement;
    } catch (e) {
      return [];
    }
  }
}
