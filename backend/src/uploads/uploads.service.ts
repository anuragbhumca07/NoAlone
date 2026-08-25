import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';

const BUCKET = 'chat-media';
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// Deliberately excludes executables/scripts — this bucket only ever needs to
// serve chat attachments back as inert downloads or inline previews.
const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'];
const ALLOWED_MIME_EXACT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
  'text/csv',
];

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_EXACT.includes(mime) || ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

// The client-reported mimetype is just a form field — trivially spoofable
// (e.g. an HTML/script payload declared as "image/png" to ride along on
// whatever Content-Type the storage layer serves it back with). Cross-check
// against the actual file bytes' magic-number signature before trusting it.
//
// file-type can't distinguish old-format .doc/.xls/.ppt from each other (all
// share the same OLE2/CFB container) and returns nothing at all for plain
// text — those get a coarser/no check rather than a false-positive reject.
const OFFICE_CONTAINER_MIMES = new Set([
  'application/x-cfb',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
]);
const NO_RELIABLE_SIGNATURE = new Set(['text/plain', 'text/csv']);

async function verifyActualFileType(declaredMime: string, buffer: Buffer): Promise<void> {
  if (NO_RELIABLE_SIGNATURE.has(declaredMime)) return;

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    throw new BadRequestException('File content does not match a recognized format');
  }

  const sameCategory = ALLOWED_MIME_PREFIXES.some((p) => declaredMime.startsWith(p) && detected.mime.startsWith(p));
  const bothOfficeLike = OFFICE_CONTAINER_MIMES.has(declaredMime) && OFFICE_CONTAINER_MIMES.has(detected.mime);
  const exactMatch = declaredMime === detected.mime;

  if (!sameCategory && !bothOfficeLike && !exactMatch) {
    throw new BadRequestException(
      `File content does not match declared type (declared ${declaredMime}, detected ${detected.mime})`,
    );
  }
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  async uploadChatFile(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('File is too large (max 15MB)');
    if (!isAllowedMime(file.mimetype)) throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    await verifyActualFileType(file.mimetype, file.buffer);

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      throw new InternalServerErrorException('Media storage is not configured');
    }

    const path = `${userId}/${randomUUID()}-${sanitizeFilename(file.originalname)}`;

    // Talk to the Storage REST API directly with fetch — the
    // @supabase/supabase-js storage client doesn't reliably carry the
    // service-role auth through to storage.objects, so writes get bounced by
    // RLS even though the key is valid (confirmed: raw REST calls with the
    // exact same key succeed).
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': file.mimetype,
      },
      body: new Uint8Array(file.buffer),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Upload failed (${res.status}): ${body}`);
      throw new InternalServerErrorException('Upload failed');
    }

    return {
      url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
      mimeType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      isImage: file.mimetype.startsWith('image/'),
    };
  }
}
