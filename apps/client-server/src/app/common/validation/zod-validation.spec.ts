import {
  Body,
  Controller,
  INestApplication,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ApplyTemplateOptionsDto,
  CreateCustomShortcutDto,
  CreateSubmissionDto,
  isZodDto,
  SubmissionType,
} from '@postybirb/types';
import * as Types from '@postybirb/types';
import { addZodSchemas } from './zod-openapi';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller()
class ValidationController {
  @Post('shortcut')
  shortcut(@Body() dto: CreateCustomShortcutDto) {
    return dto;
  }

  @Post('submission')
  @UseInterceptors(FilesInterceptor('files'))
  submission(@Body() dto: CreateSubmissionDto) {
    return dto;
  }

  @Post('template-options')
  templateOptions(@Body() dto: ApplyTemplateOptionsDto) {
    return dto;
  }
}

describe('shared Zod DTO Nest integration', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ValidationController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('leaves non-DTO route parameters and untyped bodies unchanged', () => {
    const pipe = new ZodValidationPipe();
    const body = { value: 'unchanged' };
    expect(pipe.transform('42', { type: 'param', metatype: Number })).toBe(
      '42',
    );
    expect(pipe.transform(body, { type: 'body', metatype: Object })).toBe(body);
    expect(pipe.transform(body, { type: 'body' })).toBe(body);
  });

  it('validates a DTO imported directly from the shared barrel', async () => {
    const response = await fetch(`${url}/shortcut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Shortcut' }),
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ name: 'Shortcut' });
  });

  it('returns actionable HTTP 400 errors for invalid requests', async () => {
    const response = await fetch(`${url}/shortcut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 1 }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      errors: [expect.objectContaining({ path: ['name'] })],
    });
  });

  it('rejects invalid nested template options', async () => {
    const response = await fetch(`${url}/template-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetSubmissionIds: ['submission'],
        options: [{ accountId: 'account', data: { title: 1 } }],
        overrideTitle: true,
        overrideDescription: false,
      }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      errors: [
        expect.objectContaining({ path: ['options', 0, 'data', 'title'] }),
      ],
    });
  });

  it('parses a real multipart request', async () => {
    const body = new FormData();
    body.set('type', SubmissionType.FILE);
    body.set('isTemplate', 'false');
    body.set('isMultiSubmission', 'false');
    body.set('defaultOptions', JSON.stringify({ tags: ['tag'] }));
    body.set(
      'fileMetadata',
      JSON.stringify([{ filename: 'image.png', title: 'Image' }]),
    );
    const response = await fetch(`${url}/submission`, { method: 'POST', body });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      name: '',
      type: SubmissionType.FILE,
      isTemplate: false,
      isMultiSubmission: false,
      defaultOptions: { tags: ['tag'] },
      fileMetadata: [{ filename: 'image.png', title: 'Image' }],
    });
  });

  it('returns HTTP 400 instead of silently dropping malformed multipart JSON', async () => {
    const body = new FormData();
    body.set('type', SubmissionType.FILE);
    body.set('defaultOptions', '{invalid');
    const response = await fetch(`${url}/submission`, { method: 'POST', body });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      errors: [
        expect.objectContaining({
          path: ['defaultOptions'],
          message: 'Invalid JSON',
        }),
      ],
    });
  });

  it('generates OpenAPI schemas for every shared request DTO', () => {
    const dtos = Object.values(Types)
      .filter((value) => typeof value === 'function')
      .filter(isZodDto);
    const document = addZodSchemas(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('Validation test')
          .setVersion('1')
          .build(),
        { extraModels: dtos },
      ),
    );
    expect(document.components?.schemas?.CreateCustomShortcutDto).toMatchObject(
      {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
    );
    for (const dto of dtos) {
      expect(document.components?.schemas).toHaveProperty(dto.name);
    }
    expect(JSON.stringify(document)).not.toMatch(
      /\$id|\$defs|definitions|__shared/,
    );
    expect(document.components?.schemas?.TipTapNode).toBeDefined();
    expect(document.paths['/shortcut'].post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateCustomShortcutDto' },
        },
      },
    });
  });
});
