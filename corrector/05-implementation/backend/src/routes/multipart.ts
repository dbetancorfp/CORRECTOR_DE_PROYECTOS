export interface ParsedMultipart {
  fields: Record<string, string>;
  file: { filename: string; content: Buffer } | null;
}

// Minimal multipart/form-data parser — no external dependency, only what
// the file-upload routes need: one file part plus a handful of plain text
// fields (e.g. academicYear, confirm).
export function parseMultipart(body: Buffer, boundary: string): ParsedMultipart {
  const sep = Buffer.from(`--${boundary}`);
  let start = 0;
  const parts: Buffer[] = [];
  let idx: number;
  while ((idx = body.indexOf(sep, start)) !== -1) {
    parts.push(body.slice(start, idx));
    start = idx + sep.length;
  }
  parts.push(body.slice(start));

  const fields: Record<string, string> = {};
  let file: { filename: string; content: Buffer } | null = null;

  for (const part of parts) {
    const eoh = part.indexOf('\r\n\r\n');
    if (eoh === -1) continue;
    const header = part.slice(0, eoh).toString();
    const content = part.slice(eoh + 4, part.length - 2);

    const filenameMatch = /filename="([^"]+)"/.exec(header);
    if (filenameMatch) {
      file = { filename: filenameMatch[1], content };
      continue;
    }
    const nameMatch = /name="([^"]+)"/.exec(header);
    if (nameMatch) {
      fields[nameMatch[1]] = content.toString('utf-8');
    }
  }

  return { fields, file };
}

export function extractBoundary(contentType: string | undefined): string | null {
  const boundaryMatch = /boundary=(.+)/.exec(contentType ?? '');
  return boundaryMatch ? boundaryMatch[1].trim() : null;
}

export async function readRequestBody(req: { on: (event: string, cb: (chunk?: Buffer) => void) => void }): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk?: Buffer) => { if (chunk) chunks.push(chunk); });
    req.on('end', () => resolve());
    req.on('error', (err?: Buffer) => reject(err));
  });
  return Buffer.concat(chunks);
}
