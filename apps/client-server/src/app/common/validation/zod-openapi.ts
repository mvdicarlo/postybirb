import type { OpenAPIObject } from '@nestjs/swagger';
import * as Types from '@postybirb/types';
import { z } from 'zod';

export function addZodSchemas(document: OpenAPIObject): OpenAPIObject {
  const registry = z.registry<{ id: string }>();
  registry.add(Types.TipTapNodeSchema, { id: 'TipTapNode' });
  for (const dto of Object.values(Types)) {
    if (Types.isZodDto(dto)) {
      registry.add(dto.schema.clone(), { id: dto.name });
    }
  }

  const { schemas } = z.toJSONSchema(registry, {
    target: 'openapi-3.0',
    io: 'input',
    uri: (id) => `#/components/schemas/${id}`,
  });
  for (const schema of Object.values(schemas)) {
    delete schema.$id;
  }

  const components = { ...document.components };
  components.schemas = { ...components.schemas };
  Object.assign(components.schemas, schemas);
  return { ...document, components };
}
