export function IsTestEnvironment(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'test';
}

export function IsDevelopmentEnvironment(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'development';
}
