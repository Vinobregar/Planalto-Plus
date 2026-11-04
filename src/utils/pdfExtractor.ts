/**
 * Converts a File object to a base64 string (without the data:... prefix)
 * for direct multimodal PDF ingestion (e.g. Gemini inlineData application/pdf),
 * and also extracts readable text strings from PDF streams as fallback.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo PDF.'));
    reader.readAsDataURL(file);
  });
}

function decodePdfLiteralStrings(chunk: string): string {
  const matches: string[] = [];
  const regex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(chunk)) !== null) {
    const cleaned = m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    if (cleaned.trim().length > 1) {
      matches.push(cleaned);
    }
  }
  return matches.join(' ');
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return file.text();
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);

  const extractedParts: string[] = [];

  // Attempt to decompress FlateDecode streams using native DecompressionStream
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(latin1)) !== null) {
    const rawContent = match[1];
    const startOffset = match.index + match[0].indexOf(rawContent);
    const streamBytes = bytes.subarray(
      startOffset,
      startOffset + rawContent.length
    );

    let decodedStreamText = '';
    if (typeof DecompressionStream !== 'undefined') {
      for (const format of ['deflate', 'deflate-raw'] as const) {
        try {
          // Skip 2-byte zlib header if using deflate-raw
          const slice =
            format === 'deflate-raw' && streamBytes.length > 2
              ? streamBytes.subarray(2)
              : streamBytes;
          const ds = new DecompressionStream(format);
          const writer = ds.writable.getWriter();
          writer.write(slice).catch(() => {});
          writer.close().catch(() => {});
          const decompressedBuf = await new Response(ds.readable).arrayBuffer();
          decodedStreamText = new TextDecoder('latin1').decode(decompressedBuf);
          if (decodedStreamText && /BT|Tj|TJ/.test(decodedStreamText)) {
            break;
          }
        } catch {
          // Not a valid deflate stream or encrypted
        }
      }
    }

    const source = decodedStreamText || rawContent;
    if (/BT|Tj|TJ/.test(source)) {
      const text = decodePdfLiteralStrings(source);
      if (text.trim().length > 3) {
        extractedParts.push(text);
      }
    }
  }

  const combined = extractedParts
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();

  return combined.slice(0, 60000);
}
