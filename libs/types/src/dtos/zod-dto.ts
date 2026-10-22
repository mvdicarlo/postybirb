import { z } from 'zod';

export interface ZodDto<TSchema extends z.ZodType<object> = z.ZodType<object>> {
  new (): z.output<TSchema>;
  readonly schema: TSchema;
  create(input: unknown): z.output<TSchema>;
}

export function createZodDto<TSchema extends z.ZodType<object>>(
  schema: TSchema,
): ZodDto<TSchema> {
  class SchemaDto {
    static readonly schema = schema;

    static create(input: unknown): z.output<TSchema> {
      return schema.parse(input);
    }
  }

  // Properties are supplied by schema parsing, not by the empty constructor.
  return SchemaDto as ZodDto<TSchema>;
}

export function isZodDto(value: unknown): value is ZodDto {
  return (
    typeof value === 'function' &&
    'schema' in value &&
    value.schema instanceof z.ZodType &&
    'create' in value &&
    typeof value.create === 'function'
  );
}
