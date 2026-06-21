import nodeHttps from 'node:https';

const PAC_DATA_URL_PREFIX = 'data:application/x-ns-proxy-autoconfig;base64,';

export function encodePacScriptAsDataUrl(script: string): string {
  return `${PAC_DATA_URL_PREFIX}${Buffer.from(script, 'utf8').toString('base64')}`;
}

export function isPacDataUrl(pacScript: string): boolean {
  return pacScript.startsWith(PAC_DATA_URL_PREFIX);
}

export async function fetchLocalPacScript(
  pacUrl: string,
  timeoutMs = 10_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout | undefined;

    const req = nodeHttps.request(
      pacUrl,
      {
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          Accept: 'application/x-ns-proxy-autoconfig',
        },
      },
      (response) => {
        if (timeout) {
          clearTimeout(timeout);
        }

        if ((response.statusCode ?? 0) !== 200) {
          response.resume();
          reject(
            new Error(
              `PAC fetch failed with status ${response.statusCode ?? 'unknown'}`,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      },
    );

    timeout = setTimeout(() => {
      req.destroy(new Error('PAC fetch timed out'));
    }, timeoutMs);

    req.on('error', (error) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });

    req.end();
  });
}
