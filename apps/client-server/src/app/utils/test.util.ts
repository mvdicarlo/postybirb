export function IsTestEnvironment(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'test';
}
