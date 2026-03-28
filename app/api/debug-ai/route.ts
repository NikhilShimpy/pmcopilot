/**
 * Debug AI API - Test AI provider connectivity
 */

import { NextRequest } from 'next/server';
import { callAI, resetRateLimits, getRateLimitStatus } from '@/lib/aiEngine';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Check for reset action
    const body = await request.json().catch(() => ({}));
    
    if (body.action === 'reset-rate-limits') {
      resetRateLimits();
      return Response.json({
        success: true,
        message: 'Rate limits reset successfully',
        status: getRateLimitStatus(),
      });
    }
    
    if (body.action === 'status') {
      return Response.json({
        success: true,
        status: getRateLimitStatus(),
      });
    }
    
    console.log('🔍 Testing Gemini free-tier configuration...');

    // Simple test messages
    const testMessages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant. Respond with valid JSON only.'
      },
      {
        role: 'user' as const,
        content: 'Create a simple analysis for the word "testing". Return JSON with: {"status": "success", "message": "AI working correctly", "input": "testing"}'
      }
    ];

    // Test AI call with short timeout for faster debugging
    const result = await callAI(testMessages, {
      temperature: 0.7,
      max_tokens: 500,
      timeout: 30000, // 30 seconds
    });

    console.log('✅ AI call successful:', result.provider);

    return Response.json({
      success: true,
      provider: result.provider,
      content: result.content,
      message: 'Gemini working correctly',
      rateLimitStatus: getRateLimitStatus(),
    });

  } catch (error) {
    console.error('❌ AI test failed:', error);

    // Return detailed error information
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      message: 'Gemini check failed - verify free-tier key and model configuration',
      rateLimitStatus: getRateLimitStatus(),
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    message: 'AI Debug endpoint',
    instructions: {
      test: 'POST {} to test AI providers',
      provider: 'Gemini free-tier only',
      status: 'POST {"action": "status"} to get rate limit status',
      reset: 'POST {"action": "reset-rate-limits"} to reset rate limits',
    },
    rateLimitStatus: getRateLimitStatus(),
  });
}
