export function copyObject(obj: Object): any {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}
