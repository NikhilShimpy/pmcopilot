import { NextRequest } from 'next/server';
import { handleAnalyzeSectionRequest } from '@/lib/analyzeSectionRoute';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Fallback non-dynamic section endpoint.
 * Accepts body: { analysis_id, section, ... }
 */
export async function POST(request: NextRequest) {
  return handleAnalyzeSectionRequest(request, {
    routePath: '/api/analyze/section',
  });
}
