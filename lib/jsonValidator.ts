/**
 * PMCopilot - JSON Validation System
 *
 * Robust schema validation for AI analysis results
 * Includes repair attempts for common JSON issues
 */

import { logger } from './logger';
import {
  ComprehensiveAnalysisResult,
  Problem,
  Feature,
  PRD,
  DevelopmentTask,
  ImpactEstimation,
  ValidationResult,
  ValidationError,
} from '@/types/analysis';

// ============================================
// JSON EXTRACTION
// ============================================

/**
 * Extract JSON from potentially messy AI response
 */
export function extractJSON(content: string): string | null {
  if (!content) return null;

  // Try direct parse first
  try {
    JSON.parse(content);
    return content;
  } catch {
    // Continue to extraction attempts
  }

  // Remove markdown code blocks
  const cleaned = content
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  // Try to find JSON object
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      JSON.parse(objectMatch[0]);
      return objectMatch[0];
    } catch {
      // Try repair
      const repaired = repairJSON(objectMatch[0]);
      if (repaired) return repaired;
    }
  }

  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[0]);
      return arrayMatch[0];
    } catch {
      const repaired = repairJSON(arrayMatch[0]);
      if (repaired) return repaired;
    }
  }

  return null;
}

// ============================================
// JSON REPAIR
// ============================================

/**
 * Attempt to repair common JSON issues
 */
export function repairJSON(content: string): string | null {
  if (!content) return null;

  let repaired = content;

  try {
    // Step 1: Remove JavaScript-style comments
    repaired = repaired
      .replace(/\/\/.*$/gm, '') // Single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Multi-line comments

    // Step 2: Fix trailing commas
    repaired = repaired
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    // Step 3: Add quotes to unquoted keys
    repaired = repaired.replace(
      /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":'
    );

    // Step 4: Replace single quotes with double quotes (carefully)
    repaired = repaired.replace(
      /'([^'\\]*(\\.[^'\\]*)*)'/g,
      '"$1"'
    );

    // Step 5: Escape unescaped control characters in strings
    repaired = repaired.replace(
      /"([^"\\]*(\\.[^"\\]*)*)"/g,
      (match) => {
        return match
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      }
    );

    // Step 6: Fix unquoted string values (common issue)
    repaired = repaired.replace(
      /:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g,
      (match, value, ending) => {
        // Don't quote boolean, null, or number keywords
        if (['true', 'false', 'null'].includes(value.toLowerCase())) {
          return `: ${value.toLowerCase()}${ending}`;
        }
        return `: "${value}"${ending}`;
      }
    );

    // Validate the repair worked
    JSON.parse(repaired);

    logger.info('JSON repair successful');
    return repaired;
  } catch (error) {
    logger.warn('JSON repair failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

// ============================================
// SAFE PARSE
// ============================================

/**
 * Safely parse JSON with multiple fallback strategies
 */
export function safeParseJSON<T>(content: string): T | null {
  // Try direct parse
  try {
    return JSON.parse(content) as T;
  } catch {
    // Continue
  }

  // Try extraction
  const extracted = extractJSON(content);
  if (extracted) {
    try {
      return JSON.parse(extracted) as T;
    } catch {
      // Continue
    }
  }

  // Try repair
  const repaired = repairJSON(content);
  if (repaired) {
    try {
      return JSON.parse(repaired) as T;
    } catch {
      // Give up
    }
  }

  return null;
}

// ============================================
// SCHEMA VALIDATION
// ============================================

interface FieldValidator {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  validator?: (value: any) => boolean;
  errorMessage?: string;
}

function validateField(
  obj: any,
  validator: FieldValidator
): ValidationError | null {
  const value = obj[validator.field];

  // Check required
  if (validator.required && (value === undefined || value === null)) {
    return {
      field: validator.field,
      message: `Missing required field: ${validator.field}`,
      expected: validator.type,
      received: 'undefined',
    };
  }

  // Skip type check if not present and not required
  if (value === undefined || value === null) {
    return null;
  }

  // Check type
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== validator.type) {
    return {
      field: validator.field,
      message: `Invalid type for ${validator.field}`,
      expected: validator.type,
      received: actualType,
    };
  }

  // Custom validator
  if (validator.validator && !validator.validator(value)) {
    return {
      field: validator.field,
      message: validator.errorMessage || `Invalid value for ${validator.field}`,
      expected: 'valid value',
      received: JSON.stringify(value).substring(0, 50),
    };
  }

  return null;
}

// ============================================
// PROBLEM VALIDATION
// ============================================

export function validateProblem(problem: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `problems[${index}]`;

  const validators: FieldValidator[] = [
    { field: 'title', required: true, type: 'string' },
    { field: 'description', required: true, type: 'string' },
    {
      field: 'frequency_score',
      required: true,
      type: 'number',
      validator: (v) => v >= 1 && v <= 10,
      errorMessage: 'frequency_score must be between 1 and 10',
    },
    {
      field: 'severity_score',
      required: true,
      type: 'number',
      validator: (v) => v >= 1 && v <= 10,
      errorMessage: 'severity_score must be between 1 and 10',
    },
    { field: 'evidence', required: true, type: 'array' },
  ];

  for (const validator of validators) {
    const error = validateField(problem, validator);
    if (error) {
      errors.push({ ...error, field: `${prefix}.${error.field}` });
    }
  }

  return errors;
}

// ============================================
// FEATURE VALIDATION
// ============================================

export function validateFeature(feature: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `features[${index}]`;

  const validators: FieldValidator[] = [
    { field: 'name', required: true, type: 'string' },
    {
      field: 'priority',
      required: true,
      type: 'string',
      validator: (v) => ['High', 'Medium', 'Low'].includes(v),
      errorMessage: 'priority must be High, Medium, or Low',
    },
    { field: 'reason', required: true, type: 'string' },
    { field: 'linked_problems', required: true, type: 'array' },
  ];

  for (const validator of validators) {
    const error = validateField(feature, validator);
    if (error) {
      errors.push({ ...error, field: `${prefix}.${error.field}` });
    }
  }

  return errors;
}

// ============================================
// PRD VALIDATION
// ============================================

export function validatePRD(prd: any): ValidationError[] {
  const errors: ValidationError[] = [];

  const validators: FieldValidator[] = [
    { field: 'title', required: true, type: 'string' },
    { field: 'problem_statement', required: true, type: 'string' },
    { field: 'solution_overview', required: true, type: 'string' },
    { field: 'user_stories', required: true, type: 'array' },
    { field: 'acceptance_criteria', required: true, type: 'array' },
  ];

  for (const validator of validators) {
    const error = validateField(prd, validator);
    if (error) {
      errors.push({ ...error, field: `prd.${error.field}` });
    }
  }

  return errors;
}

// ============================================
// TASK VALIDATION
// ============================================

export function validateTask(task: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `tasks[${index}]`;

  const validators: FieldValidator[] = [
    { field: 'title', required: true, type: 'string' },
    { field: 'description', required: true, type: 'string' },
    {
      field: 'type',
      required: true,
      type: 'string',
      validator: (v) =>
        ['frontend', 'backend', 'api', 'database', 'infrastructure', 'design', 'testing'].includes(v),
      errorMessage: 'type must be frontend, backend, api, database, infrastructure, design, or testing',
    },
    {
      field: 'priority',
      required: true,
      type: 'string',
      validator: (v) => ['Critical', 'High', 'Medium', 'Low'].includes(v),
      errorMessage: 'priority must be Critical, High, Medium, or Low',
    },
  ];

  for (const validator of validators) {
    const error = validateField(task, validator);
    if (error) {
      errors.push({ ...error, field: `${prefix}.${error.field}` });
    }
  }

  return errors;
}

// ============================================
// IMPACT VALIDATION
// ============================================

export function validateImpact(impact: any): ValidationError[] {
  const errors: ValidationError[] = [];

  const validators: FieldValidator[] = [
    { field: 'user_impact', required: true, type: 'string' },
    {
      field: 'user_impact_score',
      required: true,
      type: 'number',
      validator: (v) => v >= 1 && v <= 10,
      errorMessage: 'user_impact_score must be between 1 and 10',
    },
    { field: 'business_impact', required: true, type: 'string' },
    {
      field: 'business_impact_score',
      required: true,
      type: 'number',
      validator: (v) => v >= 1 && v <= 10,
      errorMessage: 'business_impact_score must be between 1 and 10',
    },
    {
      field: 'confidence_score',
      required: true,
      type: 'number',
      validator: (v) => v >= 0 && v <= 1,
      errorMessage: 'confidence_score must be between 0 and 1',
    },
  ];

  for (const validator of validators) {
    const error = validateField(impact, validator);
    if (error) {
      errors.push({ ...error, field: `impact.${error.field}` });
    }
  }

  return errors;
}

// ============================================
// FULL RESULT VALIDATION
// ============================================

/**
 * Validate complete analysis result
 */
export function validateFullResult(result: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!result || typeof result !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Result must be an object' }],
      warnings: [],
    };
  }

  // Validate problems array
  if (!Array.isArray(result.problems)) {
    errors.push({
      field: 'problems',
      message: 'problems must be an array',
      expected: 'array',
      received: typeof result.problems,
    });
  } else {
    result.problems.forEach((problem: any, index: number) => {
      errors.push(...validateProblem(problem, index));
    });

    if (result.problems.length === 0) {
      warnings.push('No problems identified in analysis');
    }
  }

  // Validate features array
  if (!Array.isArray(result.features)) {
    errors.push({
      field: 'features',
      message: 'features must be an array',
      expected: 'array',
      received: typeof result.features,
    });
  } else {
    result.features.forEach((feature: any, index: number) => {
      errors.push(...validateFeature(feature, index));
    });
  }

  // Validate PRD
  if (!result.prd || typeof result.prd !== 'object') {
    errors.push({
      field: 'prd',
      message: 'prd must be an object',
      expected: 'object',
      received: typeof result.prd,
    });
  } else {
    errors.push(...validatePRD(result.prd));
  }

  // Validate tasks array
  if (!Array.isArray(result.tasks)) {
    errors.push({
      field: 'tasks',
      message: 'tasks must be an array',
      expected: 'array',
      received: typeof result.tasks,
    });
  } else {
    result.tasks.forEach((task: any, index: number) => {
      errors.push(...validateTask(task, index));
    });
  }

  // Validate impact
  if (!result.impact || typeof result.impact !== 'object') {
    errors.push({
      field: 'impact',
      message: 'impact must be an object',
      expected: 'object',
      received: typeof result.impact,
    });
  } else {
    errors.push(...validateImpact(result.impact));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed_data: errors.length === 0 ? (result as ComprehensiveAnalysisResult) : undefined,
  };
}

// ============================================
// RESULT NORMALIZATION
// ============================================

/**
 * Normalize and fix common issues in analysis results
 */
export function normalizeResult(result: any): ComprehensiveAnalysisResult | null {
  if (!result) return null;

  try {
    // Normalize problems
    const problems: Problem[] = (result.problems || []).map((p: any, i: number) => ({
      id: p.id || `problem-${i + 1}`,
      title: String(p.title || 'Untitled Problem'),
      description: String(p.description || ''),
      frequency_score: Math.min(10, Math.max(1, Number(p.frequency_score) || 5)),
      severity_score: Math.min(10, Math.max(1, Number(p.severity_score) || 5)),
      evidence: Array.isArray(p.evidence) ? p.evidence : [],
      category: p.category,
      user_segment: p.user_segment,
    }));

    // Normalize features
    const features: Feature[] = (result.features || []).map((f: any, i: number) => ({
      id: f.id || `feature-${i + 1}`,
      name: String(f.name || 'Untitled Feature'),
      priority: ['High', 'Medium', 'Low'].includes(f.priority) ? f.priority : 'Medium',
      reason: String(f.reason || ''),
      linked_problems: Array.isArray(f.linked_problems) ? f.linked_problems : [],
      complexity: f.complexity,
      estimated_impact: f.estimated_impact,
      supporting_evidence: Array.isArray(f.supporting_evidence) ? f.supporting_evidence : [],
    }));

    // Normalize PRD
    const prd: PRD = {
      title: String(result.prd?.title || 'Product Requirements'),
      problem_statement: String(result.prd?.problem_statement || ''),
      solution_overview: String(result.prd?.solution_overview || ''),
      goals: Array.isArray(result.prd?.goals) ? result.prd.goals : [],
      non_goals: Array.isArray(result.prd?.non_goals) ? result.prd.non_goals : [],
      user_stories: Array.isArray(result.prd?.user_stories)
        ? result.prd.user_stories.map((s: any) => ({
            persona: String(s.persona || 'User'),
            action: String(s.action || ''),
            benefit: String(s.benefit || ''),
            full_statement:
              s.full_statement ||
              `As a ${s.persona || 'user'}, I want to ${s.action || ''} so that ${s.benefit || ''}`,
          }))
        : [],
      acceptance_criteria: Array.isArray(result.prd?.acceptance_criteria)
        ? result.prd.acceptance_criteria.map((c: any, i: number) => ({
            id: c.id || `AC-${i + 1}`,
            description: String(c.description || ''),
            testable: Boolean(c.testable !== false),
            priority: ['Must', 'Should', 'Could'].includes(c.priority) ? c.priority : 'Should',
          }))
        : [],
      success_metrics: Array.isArray(result.prd?.success_metrics) ? result.prd.success_metrics : [],
      risks: Array.isArray(result.prd?.risks) ? result.prd.risks : [],
      dependencies: Array.isArray(result.prd?.dependencies) ? result.prd.dependencies : [],
    };

    // Normalize tasks
    const tasks: DevelopmentTask[] = (result.tasks || []).map((t: any, i: number) => ({
      id: t.id || `TASK-${String(i + 1).padStart(3, '0')}`,
      title: String(t.title || 'Untitled Task'),
      description: String(t.description || ''),
      type: ['frontend', 'backend', 'api', 'database', 'infrastructure', 'design', 'testing'].includes(
        t.type
      )
        ? t.type
        : 'backend',
      priority: ['Critical', 'High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
      story_points: t.story_points,
      size: t.size,
      linked_feature: t.linked_feature,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
      technical_notes: t.technical_notes,
      acceptance_criteria: Array.isArray(t.acceptance_criteria) ? t.acceptance_criteria : [],
    }));

    // Normalize impact
    const impact: ImpactEstimation = {
      user_impact: String(result.impact?.user_impact || 'Unknown'),
      user_impact_score: Math.min(10, Math.max(1, Number(result.impact?.user_impact_score) || 5)),
      business_impact: String(result.impact?.business_impact || 'Unknown'),
      business_impact_score: Math.min(
        10,
        Math.max(1, Number(result.impact?.business_impact_score) || 5)
      ),
      confidence_score: Math.min(1, Math.max(0, Number(result.impact?.confidence_score) || 0.5)),
      time_to_value: result.impact?.time_to_value,
      affected_user_percentage: result.impact?.affected_user_percentage,
      revenue_impact: result.impact?.revenue_impact,
      retention_impact: result.impact?.retention_impact,
    };

    return {
      analysis_id: result.analysis_id || `analysis-${Date.now()}`,
      created_at: result.created_at || new Date().toISOString(),
      processing_time_ms: result.processing_time_ms || 0,
      model_used: result.model_used || 'unknown',
      total_feedback_items: result.total_feedback_items || 0,
      problems,
      features,
      prd,
      tasks,
      impact,
      explainability: result.explainability || {
        methodology: 'AI Analysis',
        data_quality_score: 0.8,
        confidence_factors: [],
        limitations: [],
        recommendations: [],
      },
      executive_summary: result.executive_summary || '',
      key_findings: Array.isArray(result.key_findings) ? result.key_findings : [],
      immediate_actions: Array.isArray(result.immediate_actions) ? result.immediate_actions : [],
    };
  } catch (error) {
    logger.error('Failed to normalize result', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

export default {
  extractJSON,
  repairJSON,
  safeParseJSON,
  validateFullResult,
  normalizeResult,
};
