/**
 * A simple class that can hold just about anything
 * A glorified JavaScript object
 */
export class Collection {
  private records: object;

  constructor(records: object = {}) {
    this.records = Object.assign({}, records);
  }

  /**
   * @function find
   * @param {string} key - the key to find
   * @return {any} whatever the value is for the key
   */
  public find(key: string): any {
    return this.records[key];
  }

  /**
   * @function findAll
   * @return {object} all current records/values
   */
  public findAll(): object {
    return this.records || {};
  }

  /**
   * @function update
   * @description update/set the key/pair value. Deleted from record if undefined/null
   * @param {string} key - key for the value to be stored
   * @param {any} value - value to be stored
   */
  public update(key: string, value: any): void {
    if (value || value === false || value === 0) {
      this.records[key] = value;
    } else { // Remove key if empty
      if (this.records[key]) {
        delete this.records[key];
      }
    }
  }

  public toString(): string {
    return JSON.stringify(this.records);
  }
}
