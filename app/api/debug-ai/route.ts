/**
 * Debug AI API - Test AI provider connectivity
 */

import { NextRequest } from 'next/server';
import { callAI } from '@/lib/aiEngine';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing AI providers...');

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
      message: 'AI providers working correctly'
    });

  } catch (error) {
    console.error('❌ AI test failed:', error);

    // Return detailed error information
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      message: 'AI providers failed - check API keys and connectivity'
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    message: 'AI Debug endpoint - use POST to test AI providers',
    instructions: 'Send a POST request to test AI connectivity'
  });
}