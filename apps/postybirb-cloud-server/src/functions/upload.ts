import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { createHash } from 'crypto';

const CONTAINER_NAME = 'instagram';
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB

// In-memory per-IP rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 uploads per minute per IP

// Clean up stale entries every 5 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  },
  5 * 60 * 1000,
);

function getRateLimitInfo(ip: string): {
  limited: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfterMs = entry.resetTime - now;
    return { limited: true, remaining: 0, retryAfterMs };
  }

  return {
    limited: false,
    remaining: RATE_LIMIT_MAX - entry.count,
    retryAfterMs: 0,
  };
}

function getContainerClient() {
  const connectionString = process.env.BLOB_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('BLOB_CONNECTION_STRING not configured');
  }
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient.getContainerClient(CONTAINER_NAME);
}

async function upload(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // Rate limit by IP
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-azure-clientip') ||
      'unknown';
    const rateLimit = getRateLimitInfo(clientIp);

    if (rateLimit.limited) {
      return {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
        jsonBody: { error: 'Too many requests. Try again later.' },
      };
    }

    // Read body
    const body = await request.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return { status: 400, jsonBody: { error: 'No file provided' } };
    }
    if (body.byteLength > MAX_FILE_SIZE) {
      return { status: 400, jsonBody: { error: 'File too large' } };
    }

    const mimeType = request.headers.get('content-type') || 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const buffer = Buffer.from(body);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const blobName = `${hash}.${ext}`;

    const containerClient = getContainerClient();
    await containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob already exists — skip upload if duplicate
    const exists = await blockBlobClient.exists();
    if (exists) {
      context.log(`Blob already exists (dedup): ${blobName}`);
      return {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
        jsonBody: {
          url: blockBlobClient.url,
          blobName,
        },
      };
    }

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });

    context.log(`Uploaded blob: ${blobName}`);

    return {
      status: 200,
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
      jsonBody: {
        url: blockBlobClient.url,
        blobName,
      },
    };
  } catch (e) {
    context.error('Upload failed', e);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('upload', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'upload',
  handler: upload,
});
