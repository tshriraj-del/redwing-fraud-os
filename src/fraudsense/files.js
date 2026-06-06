// Reads and classifies analyst-attached files for the investigation.
// Text/CSV/JSON/log files are folded into the case text; images and PDFs are
// sent to Claude as native vision / document content blocks.

export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file
export const MAX_FILES = 5;
const MAX_TEXT_CHARS = 20000; // keep extracted text within a sane token budget

// Anthropic-supported image media types.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File picker accept attribute.
export const ACCEPT_ATTR = [
  '.txt', '.csv', '.tsv', '.json', '.log', '.md', '.eml', '.html',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf',
].join(',');

function classify(file) {
  const name = file.name.toLowerCase();
  if (IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|gif|webp)$/.test(name)) {
    // normalise jpg → jpeg media type for the API
    const mediaType =
      file.type && IMAGE_TYPES.includes(file.type)
        ? file.type
        : /\.png$/.test(name)
          ? 'image/png'
          : /\.gif$/.test(name)
            ? 'image/gif'
            : /\.webp$/.test(name)
              ? 'image/webp'
              : 'image/jpeg';
    return { kind: 'image', mediaType };
  }
  if (file.type === 'application/pdf' || /\.pdf$/.test(name)) {
    return { kind: 'document', mediaType: 'application/pdf' };
  }
  return { kind: 'text', mediaType: file.type || 'text/plain' };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsText(file);
  });
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result ?? '');
      // strip the "data:<mime>;base64," prefix
      resolve(result.slice(result.indexOf(',') + 1));
    };
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

// Process one File into an attachment descriptor. Throws on oversize/read error.
export async function processFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB).`);
  }

  const { kind, mediaType } = classify(file);
  const base = { id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size, kind, mediaType };

  if (kind === 'text') {
    let text = await readAsText(file);
    if (text.length > MAX_TEXT_CHARS) {
      text = text.slice(0, MAX_TEXT_CHARS) + '\n…[truncated]';
    }
    return { ...base, text };
  }

  const data = await readAsBase64(file);
  return { ...base, data };
}

export function prettySize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
