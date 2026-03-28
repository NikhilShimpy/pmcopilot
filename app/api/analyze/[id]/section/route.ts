import { NextRequest } from 'next/server';
import { handleAnalyzeSectionRequest } from '@/lib/analyzeSectionRoute';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return handleAnalyzeSectionRequest(request, {
    analysisIdFromPath: id,
    routePath: `/api/analyze/${id}/section`,
  });
}
