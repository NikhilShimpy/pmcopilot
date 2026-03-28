import { NextRequest } from 'next/server';
import { handleAnalyzeSectionRequest } from '@/lib/analyzeSectionRoute';

/**
 * Fallback non-dynamic section endpoint.
 * Accepts body: { analysis_id, section, ... }
 */
export async function POST(request: NextRequest) {
  return handleAnalyzeSectionRequest(request, {
    routePath: '/api/analyze/section',
  });
}
