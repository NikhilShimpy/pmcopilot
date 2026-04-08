import axios from 'axios';
import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server';
import { assertGeminiFreeTierConfig, config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler';
import { AI_CONFIG } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ImportSourceType =
  | 'text'
  | 'file'
  | 'image'
  | 'audio'
  | 'whatsapp'
  | 'linkedin'
  | 'instagram';

interface ProcessImportRequest {
  project_id?: string;
  source_type?: ImportSourceType;
  input_method?: string;
  text?: string;
  file_base64?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  storage_bucket?: string;
  storage_path?: string;
  additional_context?: string;
}

// Vercel serverless request payloads are constrained, so keep JSON file payloads conservative.
const MAX_IMPORT_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const DEFAULT_IMPORT_BUCKET = process.env.NEXT_PUBLIC_IMPORTS_BUCKET || 'analysis-imports';

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/json',
  'application/csv',
  'text/csv',
  'text/plain',
  'text/markdown',
]);

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseWhatsappText(raw: string): string {
  const normalized = normalizeWhitespace(raw);
  const lines = normalized.split('\n').filter(Boolean);
  const parsed: string[] = [];

  const pattern =
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\s+-\s+([^:]+):\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      const [, date, time, speaker, message] = match;
      const cleanedMessage = message
        .replace(/<media omitted>/gi, '[media omitted]')
        .replace(/This message was deleted\.?/gi, '[message deleted]')
        .trim();
      if (cleanedMessage.length > 0) {
        parsed.push(`[${date} ${time}] ${speaker.trim()}: ${cleanedMessage}`);
      }
      continue;
    }

    // Include continuation lines in exported WhatsApp chats.
    if (parsed.length > 0) {
      parsed[parsed.length - 1] = `${parsed[parsed.length - 1]} ${line.trim()}`.trim();
    } else {
      parsed.push(line.trim());
    }
  }

  return normalizeWhitespace(parsed.join('\n'));
}

function parseLinkedInText(raw: string): string {
  const lines = normalizeWhitespace(raw)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const cleanedLines = lines
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/^view (more|profile|post)/i.test(line))
    .map((line) => line.replace(/^[-*]\s*/, '').trim());

  return normalizeWhitespace(cleanedLines.join('\n'));
}

function parseInstagramText(raw: string): string {
  const lines = normalizeWhitespace(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^sent\s+\d+\s+(minutes?|hours?|days?)\s+ago$/i.test(line))
    .map((line) => line.replace(/^[@#][\w.]+$/, (token) => token));

  return normalizeWhitespace(lines.join('\n'));
}

function normalizeImportContent(sourceType: ImportSourceType, raw: string): string {
  if (!raw) return '';

  switch (sourceType) {
    case 'whatsapp':
      return parseWhatsappText(raw);
    case 'linkedin':
      return parseLinkedInText(raw);
    case 'instagram':
      return parseInstagramText(raw);
    default:
      return normalizeWhitespace(raw);
  }
}

function toUtf8Text(buffer: Buffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

function stripDataPrefix(value: string): string {
  const markerIndex = value.indexOf('base64,');
  if (markerIndex >= 0) {
    return value.slice(markerIndex + 'base64,'.length);
  }
  return value;
}

async function runGeminiMultimodalExtraction({
  mimeType,
  base64Data,
  instruction,
}: {
  mimeType: string;
  base64Data: string;
  instruction: string;
}): Promise<string> {
  assertGeminiFreeTierConfig();
  const model = config.gemini.model;
  const apiKey = config.gemini.apiKey;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: instruction },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  const response = await axios.post(
    `${AI_CONFIG.GEMINI.BASE_URL}/${model}:generateContent?key=${apiKey}`,
    requestBody,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 50000,
    }
  );

  const content = response.data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || '')
    .join('\n')
    .trim();

  if (!content) {
    throw new Error('Gemini returned empty extraction output');
  }

  return content;
}

async function extractTextFromBinary({
  mimeType,
  base64Data,
  fileName,
  additionalContext,
}: {
  mimeType: string;
  base64Data: string;
  fileName?: string;
  additionalContext?: string;
}): Promise<string> {
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    const buffer = Buffer.from(base64Data, 'base64');
    return toUtf8Text(buffer);
  }

  if (mimeType === 'application/csv' || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
    const csvText = toUtf8Text(Buffer.from(base64Data, 'base64'));
    const rows = csvText
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean);
    return rows.join('\n');
  }

  if (mimeType.startsWith('image/')) {
    return runGeminiMultimodalExtraction({
      mimeType,
      base64Data,
      instruction: `Extract all meaningful user/product text from this image.
Preserve comments, sentiments, complaints, and feature requests.
Return plain text only.${additionalContext ? ` Context: ${additionalContext}` : ''}`,
    });
  }

  if (mimeType.startsWith('audio/')) {
    return runGeminiMultimodalExtraction({
      mimeType,
      base64Data,
      instruction: `Transcribe this audio accurately into plain text.
Keep important details about product feedback, problems, user needs, and suggestions.
Return plain text transcript only.${additionalContext ? ` Context: ${additionalContext}` : ''}`,
    });
  }

  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return runGeminiMultimodalExtraction({
      mimeType,
      base64Data,
      instruction: `Extract readable text from this document (${fileName || 'uploaded document'}).
Focus on requirements, user feedback, discussions, pain points, and actionable details.
Return plain text only.`,
    });
  }

  throw new Error(`Unsupported file type for import processing: ${mimeType}`);
}

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/imports/process');
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    let body: ProcessImportRequest;
    try {
      body = await request.json();
    } catch {
      throwValidationError('Invalid JSON body');
      return;
    }

    if (!body.project_id || !isValidUUID(body.project_id)) {
      throwValidationError('Valid project_id is required');
    }

    const sourceType = body.source_type || 'text';
    const allowedSources: ImportSourceType[] = [
      'text',
      'file',
      'image',
      'audio',
      'whatsapp',
      'linkedin',
      'instagram',
    ];

    if (!allowedSources.includes(sourceType)) {
      throwValidationError('Invalid source_type');
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!project) {
      throwValidationError('Project not found or access denied');
    }

    const safeText = typeof body.text === 'string' ? body.text : '';
    const safeMimeType =
      typeof body.mime_type === 'string' && body.mime_type.trim().length > 0
        ? body.mime_type.trim().toLowerCase()
        : 'text/plain';
    const safeFileName =
      typeof body.file_name === 'string' && body.file_name.trim().length > 0
        ? body.file_name.trim().slice(0, 240)
        : null;
    const safeInputMethod =
      typeof body.input_method === 'string' && body.input_method.trim().length > 0
        ? body.input_method.trim().slice(0, 80)
        : 'manual';
    const additionalContext =
      typeof body.additional_context === 'string' ? body.additional_context.trim().slice(0, 500) : '';

    const base64Data = typeof body.file_base64 === 'string' ? stripDataPrefix(body.file_base64.trim()) : '';
    if (base64Data) {
      const estimatedSize = Math.ceil((base64Data.length * 3) / 4);
      if (estimatedSize > MAX_IMPORT_FILE_SIZE_BYTES) {
        throwValidationError('File exceeds max supported size of 4MB');
      }
    }

    if (!safeText.trim() && !base64Data) {
      throwValidationError('Either text or file_base64 payload is required');
    }

    if (base64Data && !safeMimeType) {
      throwValidationError('mime_type is required for file imports');
    }

    if (
      base64Data &&
      !safeMimeType.startsWith('image/') &&
      !safeMimeType.startsWith('audio/') &&
      !safeMimeType.startsWith('text/') &&
      !DOCUMENT_MIME_TYPES.has(safeMimeType)
    ) {
      throwValidationError(`Unsupported file type: ${safeMimeType}`);
    }

    let rawText = safeText.trim();

    if (base64Data) {
      try {
        rawText = await extractTextFromBinary({
          mimeType: safeMimeType,
          base64Data,
          fileName: safeFileName || undefined,
          additionalContext,
        });
      } catch (error) {
        logger.warn('Import extraction failed', {
          sourceType,
          mimeType: safeMimeType,
          error: error instanceof Error ? error.message : 'Unknown extraction error',
        });
        throwValidationError(
          error instanceof Error
            ? error.message
            : 'Unable to process this import. Try another file or paste text manually.'
        );
      }
    }

    const normalizedText = normalizeImportContent(sourceType, rawText);
    if (normalizedText.length < 10) {
      throwValidationError('Imported content is too short after normalization');
    }

    const contentHash = createHash('sha256').update(normalizedText).digest('hex');
    const storageBucket =
      typeof body.storage_bucket === 'string' && body.storage_bucket.trim().length > 0
        ? body.storage_bucket.trim().slice(0, 100)
        : DEFAULT_IMPORT_BUCKET;
    const storagePath =
      typeof body.storage_path === 'string' && body.storage_path.trim().length > 0
        ? body.storage_path.trim().slice(0, 500)
        : null;

    const payload = {
      user_id: user.id,
      project_id: body.project_id,
      analysis_session_id: null,
      source_type: sourceType,
      import_method: safeInputMethod,
      title: safeFileName || `${sourceType} import`,
      normalized_text: normalizedText,
      raw_text: rawText,
      file_name: safeFileName,
      mime_type: safeMimeType || null,
      file_size:
        typeof body.file_size === 'number' && Number.isFinite(body.file_size)
          ? body.file_size
          : null,
      storage_bucket: storagePath ? storageBucket : null,
      storage_path: storagePath,
      metadata: {
        parser_version: 'v1',
        content_hash: contentHash,
        additional_context: additionalContext || null,
      },
    };

    const { data: savedImport, error: saveError } = await supabase
      .from('analysis_input_imports')
      .insert(payload)
      .select('id, source_type, import_method, title, normalized_text, raw_text, file_name, mime_type, storage_path, storage_bucket, metadata, created_at')
      .single();

    if (saveError) {
      if (saveError.code === '42P01') {
        throwValidationError('analysis_input_imports table is missing. Run the latest SQL migration first.');
      }
      throw saveError;
    }

    logger.info('Import processed successfully', {
      importId: savedImport.id,
      projectId: body.project_id,
      sourceType,
      method: safeInputMethod,
    });

    return successResponse(
      {
        import: savedImport,
      },
      'Import processed successfully',
      200
    );
  } catch (error) {
    logger.apiResponse('POST', '/api/imports/process', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleError(error);
  }
}
