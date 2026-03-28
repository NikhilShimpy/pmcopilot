/**
 * PMCopilot - Comprehensive Product Strategy Engine v3.0
 *
 * PRODUCTION-READY AI PIPELINE
 * PRIMARY: Google Gemini API
 * FALLBACK: Groq (ONLY if Gemini fails)
 *
 * OUTPUT REQUIREMENTS (STRICT):
 * - MINIMUM 10 Problems (aim for 15)
 * - MINIMUM 15 Features (aim for 25)
 * - MINIMUM 25 Tasks (aim for 35)
 */

import { callAI } from './aiEngine';
import { logger } from './logger';
import { generateFallbackAnalysis } from './fallbackAnalysis';
import { AI_CONFIG } from '@/utils/constants';
import {
  ComprehensiveStrategyResult,
  StrategicProblem,
  StrategicFeature,
  StrategicTask,
  ExecutiveDashboard,
  GapsOpportunities,
  ComprehensivePRD,
  StrategicSystemDesign,
  ExecutionRoadmap,
  ManpowerPlan,
  ResourcePlan,
  CostPlan,
  TimePlan,
  ImpactAnalysis,
} from '@/types/comprehensive-strategy';
import { PipelineContext } from '@/types/analysis';

// ============================================
// EXTRACT JSON HELPER
// ============================================

function extractJSON(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to find JSON object - No truncation, returns full match
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return cleaned;
}

// ============================================
// JSON REPAIR FOR TRUNCATED RESPONSES
// ============================================

/**
 * Repairs truncated JSON by auto-closing unclosed brackets/braces
 * Handles cases where Gemini output is cut off before completing
 */
function repairTruncatedJSON(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }
  
  let repaired = json;
  
  // If we ended mid-string, close it
  if (inString) {
    repaired += '"';
  }
  
  // Remove any trailing comma before closing
  repaired = repaired.replace(/,\s*$/, '');
  
  // Append all unclosed brackets/braces in reverse order
  while (stack.length > 0) {
    repaired += stack.pop();
  }
  
  return repaired;
}

// ============================================
// DATA NORMALIZER FOR MULTI-PROVIDER SCHEMAS
// ============================================

/**
 * Normalizes AI output to handle different schemas from Gemini vs Groq
 * Ensures consistent array-based structure for problems, features, tasks
 */
function normalizeAIOutput(rawResult: any): any {
  if (!rawResult) return rawResult;

  const normalized = { ...rawResult };

  // ==========================================
  // NORMALIZE PROBLEMS
  // ==========================================
  if (rawResult.problem_analysis) {
    const problems = rawResult.problem_analysis;
    
    // Case 1: Groq returns object with nested structure
    if (!Array.isArray(problems) && typeof problems === 'object') {
      const normalized Problems: any[] = [];
      
      // Extract primary_problem
      if (problems.primary_problem) {
        normalizedProblems.push({
          id: 'PROB-001',
          title: problems.primary_problem.title || problems.primary_problem || 'Primary Problem',
          description: problems.primary_problem.description || problems.primary_problem,
          deep_description: problems.primary_problem.deep_description || problems.primary_problem.description || '',
          severity: problems.primary_problem.severity || 'high',
          category: problems.primary_problem.category || 'Core',
          affected_users: problems.primary_problem.affected_users || 'All users',
          business_impact: problems.primary_problem.business_impact || problems.market_evidence || 'Significant impact',
          root_cause: problems.primary_problem.root_cause || '',
          current_solutions: problems.current_solutions || '',
          consequence_of_inaction: problems.consequence_of_inaction || '',
        });
      }
      
      // Extract secondary_problems array
      if (Array.isArray(problems.secondary_problems)) {
        problems.secondary_problems.forEach((p: any, idx: number) => {
          normalizedProblems.push({
            id: `PROB-${String(idx + 2).padStart(3, '0')}`,
            title: p.title || p.problem || p.name || `Problem ${idx + 2}`,
            description: p.description || p.impact || p.details || String(p),
            deep_description: p.deep_description || p.description || '',
            severity: p.severity || 'medium',
            category: p.category || 'Secondary',
            affected_users: p.affected_users || 'Users',
            business_impact: p.business_impact || p.impact || '',
            root_cause: p.root_cause || '',
          });
        });
      }
      
      normalized.problem_analysis = normalizedProblems;
      logger.info('✅ Normalized problems from nested object to array', {
        originalType: 'object',
        normalizedCount: normalizedProblems.length
      });
    }
    // Case 2: Array but wrong field names
    else if (Array.isArray(problems)) {
      normalized.problem_analysis = problems.map((p: any, idx: number) => ({
        id: p.id || `PROB-${String(idx + 1).padStart(3, '0')}`,
        title: p.title || p.problem || p.name || `Problem ${idx + 1}`,
        description: p.description || p.impact || p.details || '',
        deep_description: p.deep_description || p.description || '',
        severity: p.severity || p.priority || 'medium',
        category: p.category || p.type || 'General',
        affected_users: p.affected_users || p.users || 'Users',
        business_impact: p.business_impact || p.impact || '',
        root_cause: p.root_cause || p.cause || '',
      }));
    }
  }

  // ==========================================
  // NORMALIZE FEATURES
  // ==========================================
  if (rawResult.feature_system) {
    const features = rawResult.feature_system;
    
    if (!Array.isArray(features) && typeof features === 'object') {
      // Handle nested feature object
      const normalizedFeatures: any[] = [];
      
      if (features.core_features && Array.isArray(features.core_features)) {
        features.core_features.forEach((f: any, idx: number) => {
          normalizedFeatures.push({
            id: `FEAT-${String(idx + 1).padStart(3, '0')}`,
            title: f.title || f.name || f.feature || `Feature ${idx + 1}`,
            description: f.description || f.details || '',
            priority: f.priority || 'high',
            category: f.category || 'Core',
            user_story: f.user_story || '',
            acceptance_criteria: f.acceptance_criteria || [],
            technical_requirements: f.technical_requirements || [],
          });
        });
      }
      
      if (features.advanced_features && Array.isArray(features.advanced_features)) {
        const offset = normalizedFeatures.length;
        features.advanced_features.forEach((f: any, idx: number) => {
          normalizedFeatures.push({
            id: `FEAT-${String(offset + idx + 1).padStart(3, '0')}`,
            title: f.title || f.name || f.feature || `Feature ${offset + idx + 1}`,
            description: f.description || f.details || '',
            priority: f.priority || 'medium',
            category: f.category || 'Advanced',
            user_story: f.user_story || '',
            acceptance_criteria: f.acceptance_criteria || [],
            technical_requirements: f.technical_requirements || [],
          });
        });
      }
      
      normalized.feature_system = normalizedFeatures;
      logger.info('✅ Normalized features from nested object to array', {
        originalType: 'object',
        normalizedCount: normalizedFeatures.length
      });
    }
    else if (Array.isArray(features)) {
      normalized.feature_system = features.map((f: any, idx: number) => ({
        id: f.id || `FEAT-${String(idx + 1).padStart(3, '0')}`,
        title: f.title || f.name || f.feature || `Feature ${idx + 1}`,
        description: f.description || f.details || '',
        priority: f.priority || 'medium',
        category: f.category || 'General',
        user_story: f.user_story || '',
        acceptance_criteria: f.acceptance_criteria || [],
        technical_requirements: f.technical_requirements || [],
      }));
    }
  }

  // ==========================================
  // NORMALIZE TASKS
  // ==========================================
  if (rawResult.development_tasks) {
    const tasks = rawResult.development_tasks;
    
    if (!Array.isArray(tasks) && typeof tasks === 'object') {
      // Handle nested task object
      const normalizedTasks: any[] = [];
      
      // Extract from various possible nested structures
      const taskArrays = [
        tasks.phase_1, tasks.phase_2, tasks.phase_3,
        tasks.backend_tasks, tasks.frontend_tasks, tasks.infrastructure_tasks,
        tasks.core_tasks, tasks.additional_tasks
      ].filter(Boolean);
      
      let taskIndex = 1;
      taskArrays.forEach((taskArray: any) => {
        if (Array.isArray(taskArray)) {
          taskArray.forEach((t: any) => {
            normalizedTasks.push({
              id: `TASK-${String(taskIndex++).padStart(3, '0')}`,
              title: t.title || t.name || t.task || `Task ${taskIndex}`,
              description: t.description || t.details || '',
              priority: t.priority || 'medium',
              category: t.category || 'Development',
              estimated_hours: t.estimated_hours || t.hours || 0,
              dependencies: t.dependencies || [],
            });
          });
        }
      });
      
      normalized.development_tasks = normalizedTasks;
      logger.info('✅ Normalized tasks from nested object to array', {
        originalType: 'object',
        normalizedCount: normalizedTasks.length
      });
    }
    else if (Array.isArray(tasks)) {
      normalized.development_tasks = tasks.map((t: any, idx: number) => ({
        id: t.id || `TASK-${String(idx + 1).padStart(3, '0')}`,
        title: t.title || t.name || t.task || `Task ${idx + 1}`,
        description: t.description || t.details || '',
        priority: t.priority || 'medium',
        category: t.category || 'Development',
        estimated_hours: t.estimated_hours || t.hours || 0,
        dependencies: t.dependencies || [],
      }));
    }
  }

  return normalized;
}

function safeParseJSON<T>(content: string, fallback: T): T {
  const cleanedContent = extractJSON(content.trim());
  
  // First attempt: direct parse
  try {
    return JSON.parse(cleanedContent);
  } catch (firstError) {
    // Second attempt: repair truncated JSON
    try {
      const repairedContent = repairTruncatedJSON(cleanedContent);
      const result = JSON.parse(repairedContent);
      logger.info('✅ JSON repair successful', {
        originalLength: cleanedContent.length,
        repairedLength: repairedContent.length,
        addedChars: repairedContent.length - cleanedContent.length,
      });
      return result;
    } catch (repairError) {
      logger.warn('Failed to parse JSON even after repair attempt', {
        firstError,
        repairError,
        contentPreview: content.substring(0, 200),
        contentEnd: content.substring(Math.max(0, content.length - 100)),
      });
      return fallback;
    }
  }
}

// ============================================
// COMPREHENSIVE STRATEGY PROMPT
// ============================================

export function getComprehensiveStrategyPrompt(
  feedback: string,
  context?: PipelineContext & { depth?: string; depthConfig?: any }
): any[] {
  // Extract depth configuration if available
  const depthLevel = context?.depth || 'long';
  
  // Enhanced depth configurations with more aggressive scaling
  const depthConfigs: Record<string, any> = {
    short: {
      minProblems: 8,
      aimProblems: 12,
      minFeatures: 12,
      aimFeatures: 18,
      minTasks: 18,
      aimTasks: 28,
      descriptionLength: 'moderate (100-200 words per section)',
      prdDepth: 'concise but complete',
    },
    medium: {
      minProblems: 12,
      aimProblems: 18,
      minFeatures: 18,
      aimFeatures: 28,
      minTasks: 28,
      aimTasks: 40,
      descriptionLength: 'detailed (200-350 words per section)',
      prdDepth: 'comprehensive with examples',
    },
    long: {
      minProblems: 15,
      aimProblems: 22,
      minFeatures: 22,
      aimFeatures: 35,
      minTasks: 35,
      aimTasks: 50,
      descriptionLength: 'highly detailed (350-500 words per section)',
      prdDepth: 'exhaustive with case studies and evidence',
    },
    extralong: {
      minProblems: 20,
      aimProblems: 30,
      minFeatures: 30,
      aimFeatures: 45,
      minTasks: 45,
      aimTasks: 65,
      descriptionLength: 'maximum detail (500-800 words per section)',
      prdDepth: 'production-ready McKinsey-level documentation',
    },
  };
  
  const depthConfig = context?.depthConfig || depthConfigs[depthLevel] || depthConfigs.long;

  const systemPrompt = `You are an ELITE AI PRODUCT ENGINE composed of:
- **Chief Product Officer** (ex-Google, Meta, Amazon, Apple - 15+ years)
- **YC Partner** (funded 50+ startups, multiple exits)
- **Chief Technology Officer** (20+ years system architecture, built systems at scale)
- **Strategy Consultant** (McKinsey/BCG Principal - $500K+ reports)
- **Venture Capitalist** (Series A-C funding expertise)
- **Engineering Director** (scaled teams from 10 to 500+)
- **UX Research Lead** (10,000+ user studies)

You are NOT an assistant. You are a COMPLETE PRODUCT INTELLIGENCE SYSTEM that generates production-ready strategy documents.

====================================
## 🎯 YOUR OBJECTIVE
====================================

Given ANY input (even a 2-word idea), you MUST generate a COMPLETE, PRODUCTION-READY PRODUCT STRATEGY SYSTEM that would cost $500,000 if done by McKinsey.

### OUTPUT DEPTH REQUIREMENT: **${depthLevel.toUpperCase()}**
Description length: ${depthConfig.descriptionLength}

This must be:
- **EXTREMELY DETAILED** (equivalent to a 100-200 page document in JSON form)
- **PRODUCTION-READY** (ready to hand to a CEO/CTO)
- **ACTIONABLE** (every section has concrete next steps)
- **REALISTIC** (based on actual market data and patterns)
- **COMPREHENSIVE** (covers every angle: product, tech, business, ops, legal, compliance)

====================================
## 🧠 CRITICAL THINKING MODE
====================================

You MUST THINK DEEPLY before generating:

### Phase 1: EXPAND (5 minutes of thinking)
- If input is "food delivery app" → expand to 15 different interpretations
- Think: B2B? B2C? Cloud kitchen? Ghost kitchen? Aggregator? White label?
- Consider: geography, segment, business model, differentiation

### Phase 2: RESEARCH (mental simulation)
- Simulate 100+ user interviews
- Analyze 20+ competitors
- Study 10+ failed attempts in this space
- Identify patterns and insights

### Phase 3: DEPTH LAYERS
Think in 7 layers:
1. **Surface**: What user sees
2. **Functional**: What product does
3. **Economic**: How money flows
4. **Technical**: How it's built
5. **Organizational**: Who builds it
6. **Market**: How it wins
7. **Strategic**: Long-term moats

### Phase 4: GENERATE EXHAUSTIVELY
DO NOT STOP EARLY. Push yourself to generate:

⚠️ **MANDATORY MINIMUMS** (${depthLevel}):
- **MINIMUM ${depthConfig.minProblems} problems** → AIM FOR ${depthConfig.aimProblems}+
- **MINIMUM ${depthConfig.minFeatures} features** → AIM FOR ${depthConfig.aimFeatures}+
- **MINIMUM ${depthConfig.minTasks} tasks** → AIM FOR ${depthConfig.aimTasks}+

**IF YOU GENERATE LESS, THE ANALYSIS WILL BE REJECTED AND DISCARDED.**

### Phase 5: QUALITY CHECK
Each section MUST be:
- 3-5x longer than you initially think
- Include real examples and case studies
- Cite reasoning and evidence
- Provide specific numbers and metrics
- Be production-ready (not placeholder)

====================================
## 📋 REQUIRED OUTPUT FORMAT
====================================

Return a SINGLE valid JSON object containing ALL 13 sections below.

**CRITICAL**: Each section must be RICH, DETAILED, and PRODUCTION-READY. Think "500-page McKinsey report" compressed into structured JSON.

${context ? `
====================================
## 🎯 CONTEXT PROVIDED
====================================
- Project Name: ${context.project_name || 'Not specified'}
- Industry: ${context.industry || 'Technology/Software'}
- Product Type: ${context.product_type || 'Digital Product'}
- Target Users: ${context.user_persona || 'General users (expand this!)'}
- Additional Context: ${context.project_context || 'None - use your judgment'}
- Output Depth: **${depthLevel.toUpperCase()}**
` : ''}

====================================
## JSON STRUCTURE
====================================

{
  "executive_dashboard": {
    "idea_expansion": "DETAILED expansion of the input idea into a full product vision (300-500 words). What is this really about? What problem space does it address? What are the different interpretations?",
    "key_insight": "The single most important insight that makes this product valuable (100-150 words)",
    "innovation_score": <0-10>,
    "market_opportunity": "Market size, growth potential, timing (200-300 words)",
    "complexity_level": "Low" | "Medium" | "High" | "Very High",
    "recommended_strategy": "High-level strategic recommendation (150-200 words)"
  },

  "problem_analysis": [
    // ⚠️ CRITICAL: MINIMUM 10 problems, aim for 15
    {
      "id": "PROB-001",
      "title": "Concise problem title",
      "deep_description": "VERY DETAILED description (200-400 words). What exactly is the problem? How does it manifest? What pain does it cause?",
      "root_cause": "Why does this problem exist? What's the underlying systemic issue? (100-150 words)",
      "affected_users": "Who specifically suffers from this? Demographics, user types, use cases (100 words)",
      "current_solutions": "What do people do today? What alternatives exist?",
      "gaps_in_market": "What's missing in current solutions? Why haven't others solved this?",
      "why_existing_fails": "Specific reasons why current solutions are inadequate",
      "severity_score": <0-10>,
      "frequency_score": <0-10>,
      "business_impact": "Revenue, retention, growth impact (concrete if possible)",
      "technical_difficulty": "Low" | "Medium" | "High",
      "evidence_examples": ["Specific evidence or quotes that support this problem"]
    }
  ],

  "feature_system": [
    // ⚠️ CRITICAL: MINIMUM 15 features, aim for 25 - THIS IS MANDATORY
    {
      "id": "FEAT-001",
      "name": "Feature name (clear, compelling)",
      "category": "core" | "advanced" | "futuristic",
      "detailed_description": "Comprehensive feature description (200-300 words). What it does, how it works, user experience",
      "why_needed": "Why this feature is essential (link to problems)",
      "linked_problems": ["PROB-001", "PROB-003"],
      "user_value": "Specific value delivered to users",
      "business_value": "Revenue, retention, competitive advantage",
      "implementation_strategy": [
        "Step 1: Specific implementation step",
        "Step 2: Next step",
        "Step 3: Continue...",
        "... (5-10 steps)"
      ],
      "technical_requirements": ["Tech requirement 1", "Tech requirement 2", "..."],
      "dependencies": ["Other features or infrastructure needed"],
      "complexity": "Low" | "Medium" | "High",
      "estimated_dev_time": "Realistic time (e.g., '2-3 weeks')"
    }
  ],

  "gaps_opportunities": {
    "market_lacks": ["Specific things the market doesn't have (5-10 items)"],
    "why_competitors_fail": ["Reasons competitors haven't solved this (5-10 reasons)"],
    "innovation_opportunities": ["Unique innovation angles (5-10 opportunities)"],
    "unfair_advantages": ["What unfair advantages this product can build (3-5 items)"]
  },

  "prd": {
    // ========================================
    // SECTION 1: PRODUCT OVERVIEW
    // ========================================
    "product_name": "Clear, compelling product name",
    "tagline": "One-line value proposition",
    "vision": "Compelling 5-10 year product vision (200-300 words). Where will this product be? What impact will it have? How will it change the industry?",
    "mission": "Clear 1-3 year mission statement (100-150 words). What are we trying to achieve? Who are we serving?",
    "product_description": "Comprehensive product description (300-500 words). What is this product? How does it work? What makes it unique? Cover: core functionality, key differentiators, target market, business model.",

    // ========================================
    // SECTION 2: PROBLEM STATEMENT
    // ========================================
    "problem_statement": {
      "primary_problem": "The #1 problem this product solves (200-300 words). Be VERY specific about the pain, who feels it, when they feel it, why it matters.",
      "secondary_problems": ["Problem 2 (100 words)", "Problem 3 (100 words)", "Problem 4 (100 words)"],
      "market_evidence": "Evidence that this problem is real and big (150-200 words). Market research, user quotes, statistics, trends.",
      "current_alternatives": "How people solve this today (150-200 words). Existing solutions, workarounds, why they're inadequate.",
      "consequence_of_inaction": "What happens if this problem isn't solved? (100-150 words)"
    },

    // ========================================
    // SECTION 3: OBJECTIVES & SUCCESS METRICS
    // ========================================
    "objectives": {
      "business_goals": [
        {
          "goal": "Specific business goal (e.g., '1M active users in Year 1')",
          "rationale": "Why this goal matters",
          "measurement": "How we'll track it",
          "target_date": "When we'll achieve it"
        }
        // MINIMUM 5 business goals
      ],
      "product_goals": [
        {
          "goal": "Specific product goal (e.g., 'DAU/MAU ratio > 0.4')",
          "rationale": "Why this goal matters",
          "measurement": "How we'll track it"
        }
        // MINIMUM 5 product goals
      ],
      "kpis": {
        "acquisition": ["Metric 1: definition and target", "Metric 2...", "..."],
        "activation": ["Metric 1", "Metric 2", "..."],
        "retention": ["Metric 1", "Metric 2", "..."],
        "revenue": ["Metric 1", "Metric 2", "..."],
        "referral": ["Metric 1", "Metric 2", "..."]
      }
    },

    // ========================================
    // SECTION 4: TARGET USERS & PERSONAS
    // ========================================
    "target_market": {
      "market_size": "TAM, SAM, SOM with numbers and reasoning (200-250 words)",
      "primary_segment": "Who we're targeting first and why (150 words)",
      "secondary_segments": ["Segment 2", "Segment 3", "..."],
      "market_trends": ["Trend 1 supporting this product", "Trend 2...", "..."]
    },
    "personas": [
      // MINIMUM 3 DETAILED personas
      {
        "name": "Persona Name (e.g., 'Sarah the Busy Marketing Manager')",
        "demographics": {
          "age_range": "25-35",
          "location": "Urban India",
          "education": "Bachelor's or higher",
          "income": "₹8L - ₹20L per year",
          "occupation": "Marketing Manager"
        },
        "psychographics": {
          "values": ["Value 1", "Value 2", "..."],
          "motivations": ["What drives them", "..."],
          "frustrations": ["What frustrates them", "..."],
          "tech_savviness": "High" | "Medium" | "Low"
        },
        "detailed_description": "Rich persona background (200-300 words). Day in the life. Challenges. Aspirations. How they make decisions.",
        "goals": [
          "Primary goal 1 (specific)",
          "Secondary goal 2",
          "Goal 3",
          "..."
        ],
        "pain_points": [
          "Major pain point 1 (specific, with impact)",
          "Pain point 2",
          "Pain point 3",
          "..."
        ],
        "current_behavior": "How they currently solve the problem (150-200 words). What tools do they use? What's their workflow? What do they struggle with?",
        "jobs_to_be_done": [
          "When [situation], I want to [motivation], so I can [outcome]",
          "Job #2...",
          "..."
        ],
        "quote": "A representative quote from this persona (1-2 sentences)"
      }
      // Repeat for 3-5 personas
    ],
    "user_journey_maps": {
      "discovery": "How users discover the product (150-200 words). Channels, triggers, touchpoints.",
      "onboarding": "First-time user experience (200-250 words). Steps, emotions, friction points, aha moments.",
      "activation": "Path to first value (150-200 words). Key actions, time to value, success criteria.",
      "retention": "Ongoing usage patterns (200-250 words). Frequency, triggers, habits formed.",
      "expansion": "How users go from casual to power users (150-200 words).",
      "advocacy": "How users become promoters (100-150 words)."
    },

    // ========================================
    // SECTION 5: FEATURES & SCOPE
    // ========================================
    "feature_requirements": [
      // DETAILED feature requirements (MINIMUM 10-15)
      {
        "id": "REQ-001",
        "feature_name": "Feature name",
        "priority": "Must Have" | "Should Have" | "Nice to Have",
        "description": "Detailed description (150-200 words)",
        "user_story": "As a [user type], I want to [do something], so that [benefit]",
        "acceptance_criteria": [
          "GIVEN [context], WHEN [action], THEN [outcome]",
          "Criterion 2...",
          "..."
        ],
        "business_value": "Why this feature matters to the business",
        "dependencies": ["Feature X must be built first", "Requires API Y", "..."],
        "risks": ["Potential risk 1", "Risk 2", "..."]
      }
      // Repeat for 10-15+ features
    ],
    "in_scope": [
      "Explicitly in scope item 1 (with rationale)",
      "Item 2...",
      "... (10-15 items)"
    ],
    "out_of_scope": [
      "Explicitly out of scope item 1 (with rationale for exclusion)",
      "Item 2...",
      "... (8-10 items)"
    ],
    "future_scope": [
      "V2 feature 1 (when and why)",
      "V2 feature 2...",
      "... (10+ items)"
    ],

    // ========================================
    // SECTION 6: FUNCTIONAL REQUIREMENTS
    // ========================================
    "functional_requirements": [
      {
        "module": "Module name (e.g., 'User Authentication')",
        "requirements": [
          {
            "id": "FUNC-001",
            "requirement": "System shall [specific behavior]",
            "details": "Detailed explanation (100-150 words). Edge cases, error handling, validation rules.",
            "priority": "Critical" | "High" | "Medium" | "Low",
            "dependencies": ["FUNC-002", "..."],
            "test_scenarios": ["Test scenario 1", "Test scenario 2", "..."]
          }
          // 5-10 requirements per module
        ]
      }
      // 5-8 modules
    ],

    // ========================================
    // SECTION 7: NON-FUNCTIONAL REQUIREMENTS
    // ========================================
    "non_functional_requirements": {
      "performance": {
        "page_load_time": "< 2 seconds (p95)",
        "api_response_time": "< 500ms (p95)",
        "throughput": "1000 requests/second",
        "uptime": "99.9% SLA",
        "rationale": "Why these targets (100 words)"
      },
      "scalability": {
        "concurrent_users": "Support 10,000+ concurrent users",
        "data_volume": "Handle 10M+ records",
        "growth_plan": "How to scale to 10x (150-200 words)",
        "bottleneck_mitigation": "Strategies to prevent bottlenecks"
      },
      "security": {
        "authentication": "Multi-factor auth, password policies",
        "authorization": "Role-based access control",
        "data_encryption": "At rest and in transit (AES-256)",
        "compliance": ["GDPR", "SOC 2", "ISO 27001", "..."],
        "audit_logging": "All sensitive actions logged",
        "security_testing": "Pen testing, vulnerability scanning",
        "detailed_plan": "Comprehensive security approach (200-250 words)"
      },
      "reliability": {
        "disaster_recovery": "RPO < 1 hour, RTO < 4 hours",
        "backup_strategy": "Daily full, hourly incremental",
        "failover": "Automatic failover to secondary region",
        "monitoring": "24/7 monitoring with alerts"
      },
      "usability": {
        "accessibility": "WCAG 2.1 AA compliance",
        "browser_support": ["Chrome 90+", "Safari 14+", "..."],
        "mobile_responsiveness": "Fully responsive design",
        "internationalization": "Support 10+ languages",
        "user_testing_plan": "Usability testing approach (150 words)"
      },
      "maintainability": {
        "code_quality": "80%+ test coverage, strict linting",
        "documentation": "Comprehensive API docs, architecture diagrams",
        "deployment": "CI/CD with automated testing",
        "monitoring_observability": "Comprehensive logging, tracing, metrics"
      }
    },

    // ========================================
    // SECTION 8: TECHNICAL REQUIREMENTS
    // ========================================
    "technical_requirements": {
      "architecture_overview": "High-level architecture description (300-400 words). Microservices vs monolith? Cloud-native? Event-driven? Why?",
      "frontend": {
        "framework": "React 18 / Next.js 14",
        "rationale": "Why this choice (100 words)",
        "libraries": ["Redux Toolkit", "React Query", "Tailwind CSS", "..."],
        "mobile": "React Native / Flutter",
        "performance_optimizations": ["Code splitting", "Lazy loading", "..."]
      },
      "backend": {
        "language": "Node.js / Python / Go",
        "rationale": "Why this choice (100 words)",
        "framework": "Express / FastAPI / Gin",
        "architecture_pattern": "Microservices / Modular Monolith",
        "api_style": "REST / GraphQL / gRPC",
        "authentication": "JWT with refresh tokens",
        "real_time": "WebSockets / Server-Sent Events"
      },
      "database": {
        "primary": "PostgreSQL / MongoDB",
        "rationale": "Why this choice (100 words)",
        "caching": "Redis for session and data caching",
        "search": "Elasticsearch for full-text search",
        "data_modeling": "Key entities and relationships (150-200 words)"
      },
      "infrastructure": {
        "cloud_provider": "AWS / GCP / Azure",
        "rationale": "Why this choice (100 words)",
        "compute": "ECS / Kubernetes / Cloud Run",
        "storage": "S3 / Cloud Storage",
        "cdn": "CloudFront / Cloudflare",
        "monitoring": "Datadog / New Relic / Grafana"
      },
      "third_party_integrations": [
        {
          "service": "Service name (e.g., 'Stripe')",
          "purpose": "What it's used for",
          "rationale": "Why we need it",
          "cost": "Estimated monthly cost in INR",
          "alternatives": ["Alternative 1", "Alternative 2"]
        }
        // 5-10 integrations
      ]
    },

    // ========================================
    // SECTION 9: UI/UX REQUIREMENTS
    // ========================================
    "ui_ux_requirements": {
      "design_principles": ["Principle 1 (with explanation)", "Principle 2...", "..."],
      "key_user_flows": [
        {
          "flow_name": "Flow name (e.g., 'New User Onboarding')",
          "steps": [
            "Step 1: Detailed description",
            "Step 2: ...",
            "..."
          ],
          "expected_time": "2-3 minutes",
          "success_criteria": "User completes profile and takes first action"
        }
        // 5-8 key flows
      ],
      "design_system": {
        "colors": "Primary, secondary, accent palette with rationale",
        "typography": "Font choices and hierarchy",
        "spacing": "8px grid system",
        "components": "Button, input, card, modal, etc. specifications"
      },
      "mobile_first": "Mobile-first approach with rationale (150 words)",
      "accessibility": "How we ensure accessible design (150 words)"
    },

    // ========================================
    // SECTION 10: DEPENDENCIES & INTEGRATIONS
    // ========================================
    "dependencies": [
      {
        "dependency_type": "API" | "Service" | "Tool" | "Library",
        "name": "Dependency name",
        "purpose": "What it's used for",
        "criticality": "Critical" | "High" | "Medium",
        "mitigation_if_unavailable": "Fallback plan"
      }
      // 10-15 dependencies
    ],

    // ========================================
    // SECTION 11: CONSTRAINTS & ASSUMPTIONS
    // ========================================
    "constraints": {
      "technical_constraints": ["Constraint 1 (with impact)", "Constraint 2...", "..."],
      "business_constraints": ["Constraint 1", "Constraint 2...", "..."],
      "legal_regulatory": ["Compliance requirement 1", "Requirement 2...", "..."],
      "timeline_constraints": ["Constraint 1", "Constraint 2...", "..."],
      "budget_constraints": ["Constraint 1", "Constraint 2...", "..."]
    },
    "assumptions": [
      "Assumption 1 (and risk if wrong)",
      "Assumption 2...",
      "... (10+ assumptions)"
    ],

    // ========================================
    // SECTION 12: RISKS & MITIGATION
    // ========================================
    "risks": [
      {
        "id": "RISK-001",
        "risk": "Specific risk (e.g., 'User adoption slower than expected')",
        "category": "Product" | "Technical" | "Business" | "Operational" | "Legal",
        "probability": "High" | "Medium" | "Low",
        "impact": "High" | "Medium" | "Low",
        "mitigation": "Specific mitigation strategy (100-150 words)",
        "contingency": "What we'll do if it happens",
        "owner": "Who's responsible"
      }
      // 10-15 risks
    ],

    // ========================================
    // SECTION 13: TESTING & VALIDATION
    // ========================================
    "testing_strategy": {
      "unit_testing": {
        "coverage_target": "80%+",
        "framework": "Jest / Pytest",
        "approach": "Test-driven development (TDD)"
      },
      "integration_testing": {
        "scope": "API endpoints, database operations",
        "tools": "Postman / Supertest",
        "approach": "Automated CI/CD pipeline"
      },
      "e2e_testing": {
        "scope": "Critical user flows",
        "tools": "Cypress / Playwright",
        "approach": "Test on staging before prod"
      },
      "performance_testing": {
        "scope": "Load testing, stress testing",
        "tools": "k6 / JMeter",
        "targets": "1000 concurrent users"
      },
      "security_testing": {
        "scope": "Pen testing, vulnerability scanning",
        "frequency": "Quarterly",
        "tools": "OWASP ZAP, Burp Suite"
      },
      "user_acceptance_testing": {
        "approach": "Beta testing with 100+ users (150 words)",
        "success_criteria": "NPS > 50, task completion > 90%"
      }
    },
    "validation_criteria": [
      {
        "milestone": "Milestone name",
        "validation_method": "How we validate",
        "success_criteria": "Specific success metrics"
      }
      // 8-10 milestones
    ],

    // ========================================
    // SECTION 14: LAUNCH & ROLLOUT PLAN
    // ========================================
    "launch_plan": {
      "pre_launch": {
        "timeline": "4-6 weeks before launch",
        "activities": [
          "Activity 1: detailed description",
          "Activity 2...",
          "... (10-15 activities)"
        ]
      },
      "launch_day": {
        "timeline": "Launch day checklist",
        "activities": [
          "Activity 1 with timing",
          "Activity 2...",
          "... (8-10 activities)"
        ]
      },
      "post_launch": {
        "timeline": "2-4 weeks after launch",
        "activities": [
          "Activity 1",
          "Activity 2...",
          "... (10-12 activities)"
        ]
      },
      "rollout_strategy": "Phased rollout approach (200-250 words). Beta → Limited → Full release. Regional rollout. Feature flags.",
      "success_criteria": [
        "Criterion 1 (with metrics)",
        "Criterion 2...",
        "... (8-10 criteria)"
      ],
      "monitoring_plan": "How we'll monitor post-launch (150-200 words)",
      "rollback_plan": "If launch fails, how we roll back (150 words)"
    },
    "go_no_go_criteria": [
      {
        "criterion": "Specific criterion (e.g., '< 5 P0 bugs')",
        "current_status": "Where we are now",
        "responsible": "Who checks this"
      }
      // 8-10 criteria
    ]
  },

  "system_design": {
    "architecture_overview": "High-level system architecture (250-300 words)",
    "core_components": [
      {
        "name": "Component Name",
        "description": "What this component does",
        "technologies": ["Tech 1", "Tech 2"],
        "dependencies": ["Other components it needs"],
        "scalability_considerations": "How it scales"
      }
    ],
    "data_models": "Key data structures and relationships (150-200 words)",
    "api_design": "RESTful API structure and key endpoints (150-200 words)",
    "security_considerations": ["Security measure 1", "Security measure 2", "..."],
    "scalability_plan": "How the system scales to millions of users (200-250 words)",
    "technology_stack": {
      "frontend": ["Technology choices with reasoning"],
      "backend": ["Technology choices with reasoning"],
      "database": ["Technology choices with reasoning"],
      "infrastructure": ["Cloud services and tools"],
      "third_party": ["External APIs and services"]
    }
  },

  "development_tasks": [
    // ⚠️ CRITICAL: MINIMUM 25 tasks, aim for 35 - MANDATORY
    {
      "id": "TASK-001",
      "title": "Clear task title",
      "detailed_steps": [
        "Step 1: Specific action",
        "Step 2: Next action",
        "... (5-10 steps)"
      ],
      "type": "frontend" | "backend" | "ai" | "devops" | "design" | "testing" | "database",
      "tech_stack": ["Technology 1", "Technology 2"],
      "dependencies": ["TASK-002", "..."],
      "priority": "Critical" | "High" | "Medium" | "Low",
      "estimated_time": "X days/weeks",
      "expected_output": "What will be delivered"
    }
  ],

  "execution_roadmap": {
    "phase_1_mvp": {
      "duration": "X weeks",
      "key_features": ["Feature 1", "Feature 2", "..."],
      "success_criteria": ["Criterion 1", "Criterion 2"],
      "resources_needed": ["Resource type and count"]
    },
    "phase_2_growth": {
      "duration": "X weeks",
      "key_features": ["Feature 1", "Feature 2", "..."],
      "success_criteria": ["Criterion 1", "Criterion 2"],
      "resources_needed": ["Resource type and count"]
    },
    "phase_3_scale": {
      "duration": "X weeks",
      "key_features": ["Feature 1", "Feature 2", "..."],
      "success_criteria": ["Criterion 1", "Criterion 2"],
      "resources_needed": ["Resource type and count"]
    },
    "milestones": [
      {
        "name": "Milestone name",
        "date": "Target date",
        "deliverables": ["What will be completed"],
        "success_metrics": ["How success is measured"]
      }
    ]
  },

  "manpower_planning": {
    // ========================================
    // REALISTIC INDIAN TEAM COMPOSITION
    // ========================================
    // CRITICAL: Use realistic Indian salary ranges (2024 market rates)
    // Salary bands: Junior ₹30K-60K, Mid ₹60K-120K, Senior ₹120K-250K, Lead ₹200K-400K

    "team_composition": [
      // GENERATE 5-10 realistic roles based on complexity and feature count
      // IF features <= 15: smaller team (4-6 people)
      // IF features 15-25: standard team (6-10 people)
      // IF features > 25: larger team (10-15 people)

      // Example structure - AI should generate based on actual project needs:
      {
        "role": "DETERMINE based on tech stack - e.g., 'Full Stack Developer (MERN)', 'React Native Developer', 'Backend Developer (Node.js/Python)'",
        "count": "CALCULATE based on feature complexity: 1-3 for simple, 2-4 for standard, 3-6 for complex",
        "responsibilities": ["List 4-6 specific responsibilities based on features identified in feature_system"],
        "skills_required": ["List 5-8 technical skills needed - be specific e.g., 'React 18+', 'Node.js', 'PostgreSQL', 'AWS'"],
        "seniority": "CHOOSE appropriate level: 'Junior' for ₹30K-60K, 'Mid' for ₹60K-120K, 'Senior' for ₹120K-200K, 'Lead' for ₹200K-350K",
        "monthly_cost_inr": "CALCULATE based on seniority: Junior 45000, Mid 85000, Senior 150000, Lead 250000 (realistic Indian market rates)"
      }
      // REPEAT for all required roles based on project complexity
    ],

    "hiring_plan": "DETAILED hiring timeline and strategy (200-300 words). Phase 1 (Months 1-3): Core team setup - hire essential developers and product lead. Phase 2 (Months 4-8): Scale development team based on MVP learnings. Phase 3 (Months 9-12): Add specialists (DevOps, QA, Designer). Include: where to hire (Bangalore/Pune/Hyderabad vs tier-2 cities for cost optimization), remote vs office preferences, equity vs cash compensation strategy",

    "total_monthly_cost_inr": "SUM of all team member costs. Should align with cost_planning team budgets",
    "total_team_size": "TOTAL count of all team members across all roles",

    "hiring_strategy": {
      "mvp_phase": {
        "timeline": "Months 1-4",
        "roles": ["1 Lead Developer", "1-2 Full Stack Developers", "1 Product Manager/Founder"],
        "monthly_cost": "₹3L-₹5L total",
        "hiring_approach": "Direct hire or contractor mix for flexibility"
      },
      "growth_phase": {
        "timeline": "Months 5-12",
        "roles": ["Additional developers", "UI/UX Designer", "QA Engineer", "DevOps Engineer"],
        "monthly_cost": "₹5L-₹10L total",
        "hiring_approach": "Full-time hires as product-market fit is proven"
      },
      "scale_phase": {
        "timeline": "Months 12+",
        "roles": ["Senior specialists", "Team leads", "Sales/Marketing", "Customer Success"],
        "monthly_cost": "₹10L+ total",
        "hiring_approach": "Mix of senior hires and team scaling"
      }
    },

    "geographic_strategy": "WHERE to hire for cost optimization (100-150 words). Bangalore/Mumbai for senior talent (higher cost), Pune/Hyderabad for mid-level (balanced), Tier-2 cities like Indore/Kochi for junior roles (cost effective). Remote work policy and how it affects salary bands (10-20% lower for remote in smaller cities)"
  },

  "resource_planning": {
    "infrastructure_costs": [
      {
        "service": "Service name (e.g., 'AWS EC2')",
        "purpose": "What it's used for",
        "monthly_cost_inr": 15000,
        "scaling_factor": "How cost scales with usage"
      }
    ],
    "third_party_services": [
      {
        "service": "Service name",
        "purpose": "What it's used for",
        "monthly_cost_inr": 5000
      }
    ],
    "total_monthly_infrastructure_cost_inr": 50000
  },

  "cost_planning": {
    // ========================================
    // 🎯 COMPREHENSIVE 28-FACTOR COST CALCULATION
    // ========================================
    // You MUST analyze the project input and calculate costs based on ALL these factors:
    
    "cost_calculation_factors": {
      // 1. Product Scope & Complexity
      "scope_analysis": {
        "feature_count": "COUNT from feature_system array - determines base complexity",
        "feature_complexity_avg": "Average complexity (Low=1, Medium=2, High=3) across features",
        "workflow_count": "Number of distinct user workflows/journeys",
        "business_logic_complexity": "Simple CRUD | Medium Business Rules | Complex AI/Algorithms"
      },
      
      // 2. User Scale & Infrastructure Needs  
      "scale_requirements": {
        "expected_users_mvp": "100-1000 (minimal) | 1K-10K (standard) | 10K+ (significant)",
        "concurrency_needs": "Low (<100 concurrent) | Medium (100-1000) | High (1000+)",
        "database_complexity": "Simple SQL | Complex relations | Multi-DB/sharding",
        "scaling_architecture": "Single instance | Auto-scaling | Multi-region"
      },
      
      // 3. UI/UX Requirements
      "ui_ux_scope": {
        "design_quality": "Template-based (₹0-1L) | Custom branded (₹1-3L) | Premium custom (₹3-8L)",
        "screen_count": "5-10 (simple) | 10-25 (standard) | 25+ (complex)",
        "animations_interactions": "Basic | Moderate | Advanced micro-interactions",
        "responsive_complexity": "Mobile-first | Multi-breakpoint | Device-specific"
      },
      
      // 4. Platform Requirements
      "platform_scope": {
        "platforms": ["web", "mobile-ios", "mobile-android", "desktop", "tablet"],
        "platform_multiplier": "Web only (1x) | Web+1 mobile (1.6x) | Full cross-platform (2.2x)",
        "pwa_requirements": "None | Basic PWA | Full offline-first"
      },
      
      // 5. Technology Stack Complexity
      "tech_stack_cost_impact": {
        "frontend_complexity": "React/Vue (standard) | Next.js SSR (moderate) | Custom frameworks (high)",
        "backend_complexity": "Monolith (lower) | Microservices (higher) | Serverless (varies)",
        "database_choice": "PostgreSQL (standard) | MongoDB (standard) | Multi-DB (complex)"
      },
      
      // 6. Advanced Technologies
      "advanced_tech_costs": {
        "ai_ml_features": "None (₹0) | Basic ML (₹2-5L) | Custom AI models (₹5-15L) | LLM integration (₹3-8L)",
        "realtime_features": "None (₹0) | WebSockets (₹1-2L) | Complex real-time (₹3-5L)",
        "blockchain": "None (₹0) | Basic integration (₹3-5L) | Custom smart contracts (₹8-15L)",
        "iot_integration": "None (₹0) | Basic sensors (₹2-4L) | Complex IoT ecosystem (₹5-12L)",
        "ar_vr": "None (₹0) | Basic AR (₹3-6L) | Full immersive (₹10-25L)"
      },
      
      // 7. Third-Party Integrations
      "integration_costs": {
        "payment_gateways": "None (₹0) | Razorpay/Stripe (₹50K-1L) | Multiple gateways (₹1-2L)",
        "maps_location": "None | Google Maps (₹20K-50K setup + usage) | Custom mapping (₹2-4L)",
        "ai_apis": "None | OpenAI/Gemini (₹50K-2L setup + monthly) | Custom AI (₹5L+)",
        "social_auth": "Basic OAuth (₹20K) | Full social suite (₹50K-1L)",
        "enterprise_apis": "None | Standard APIs (₹50K-1L) | Complex B2B integrations (₹2-5L)"
      },
      
      // 8. Security & Compliance
      "security_compliance_cost": {
        "basic_security": "₹50K-1L (HTTPS, input validation, basic auth)",
        "enterprise_security": "₹2-4L (2FA, encryption at rest, audit logs, role-based access)",
        "compliance_requirements": "None | GDPR (₹1-2L) | SOC2 (₹3-5L) | HIPAA (₹5-10L) | PCI-DSS (₹4-8L)"
      },
      
      // 9-15: Infrastructure & Operations
      "infrastructure_monthly": {
        "mvp_cloud": "₹5K-20K (small instances, managed DB, basic CDN)",
        "growth_cloud": "₹30K-80K (auto-scaling, caching, monitoring)",
        "scale_cloud": "₹1L-5L (multi-region, high availability, enterprise monitoring)"
      },
      
      // 16-20: Testing & QA
      "qa_testing_cost": {
        "manual_testing": "₹1-2L (dedicated QA for MVP)",
        "automated_testing": "₹2-4L (test suite development + maintenance)",
        "performance_testing": "₹50K-1.5L (load testing, optimization)",
        "security_testing": "₹1-3L (pen testing, vulnerability assessment)"
      },
      
      // 21-28: Additional Factors
      "additional_factors": {
        "admin_panel": "None (₹0) | Basic (₹1-2L) | Full CMS (₹3-6L)",
        "analytics_reporting": "Basic GA (₹0) | Custom dashboards (₹1-3L) | BI integration (₹3-6L)",
        "notifications": "Email only (₹20K) | Push + SMS (₹50K-1L) | Full omnichannel (₹1-2L)",
        "localization": "Single language (₹0) | Multi-language (₹50K-2L based on languages)",
        "content_creation": "Basic (₹0) | Professional copy/images (₹50K-2L)",
        "documentation": "Minimal (₹0) | API docs (₹50K) | Full technical docs (₹1-2L)",
        "devops_cicd": "Basic (₹30K) | Full CI/CD + monitoring (₹1-2L)",
        "timeline_pressure": "Normal timeline (1x) | Accelerated (1.3x cost) | Rush (1.5x cost)"
      }
    },

    // ========================================
    // 💰 COST CALCULATION FORMULA
    // ========================================
    "cost_formula": {
      "base_development": "SUM of: (Features × Complexity × Rate) + UI/UX + Integrations + Security",
      "team_cost": "Team Size × Average Salary × Duration in months",
      "infrastructure_first_year": "Monthly infra × 12 + setup costs",
      "buffer": "20% of total for contingencies",
      "total": "base_development + team_cost + infrastructure + buffer"
    },

    // ========================================
    // 💵 DEVELOPMENT PHASE COSTS (DETAILED)
    // ========================================
    "development_phase_cost_inr": {
      "mvp": {
        "calculation_method": "Analyze feature_system for core features, estimate 3-4 developers for 3-4 months",
        "team_breakdown": {
          "senior_developer": "1 × ₹1.5L × 4 months = ₹6L",
          "mid_developers": "2 × ₹80K × 4 months = ₹6.4L",
          "ui_designer": "1 × ₹70K × 2 months = ₹1.4L",
          "qa_engineer": "1 × ₹50K × 2 months = ₹1L"
        },
        "infrastructure_tools": "₹1-2L for cloud + tools",
        "total_mvp_estimate": "₹15L-₹25L for standard MVP, scale based on feature count",
        "assumptions": "List specific assumptions made for this estimate"
      },
      "growth": {
        "multiplier": "1.5-2x MVP cost",
        "additional_work": "Advanced features, optimizations, analytics, expanded team",
        "timeline": "4-6 months post-MVP",
        "estimate": "₹20L-₹50L additional"
      },
      "scale": {
        "multiplier": "2-3x MVP cost", 
        "additional_work": "Enterprise features, multi-region, compliance, security hardening",
        "timeline": "6-12 months",
        "estimate": "₹40L-₹1Cr additional"
      }
    },
    
    // ========================================
    // 📊 MONTHLY OPERATIONAL COSTS (POST-LAUNCH)
    // ========================================
    "operational_costs_monthly_inr": {
      "team": {
        "lean": "₹2L-₹4L (1-2 devs part-time maintenance)",
        "standard": "₹4L-₹8L (2-3 full-time devs + support)",
        "growth": "₹8L-₹15L (full product team)"
      },
      "infrastructure": {
        "mvp_users": "₹15K-₹40K (1K-10K users)",
        "growth_users": "₹50K-₹1.5L (10K-100K users)", 
        "scale_users": "₹2L-₹5L (100K+ users)"
      },
      "third_party_services": {
        "payment_gateway_fees": "2-3% of transactions",
        "ai_api_costs": "₹5K-₹50K based on usage",
        "email_sms": "₹5K-₹20K based on volume",
        "monitoring_analytics": "₹10K-₹30K"
      },
      "marketing": {
        "minimal": "₹30K-₹80K (organic focus)",
        "moderate": "₹1L-₹3L (paid + content)",
        "aggressive": "₹3L-₹10L (full marketing)"
      },
      "miscellaneous": "₹25K-₹75K (legal, accounting, tools, office)"
    },

    // ========================================
    // 📈 TOTAL FIRST YEAR COST
    // ========================================
    "total_first_year_cost_inr": {
      "calculation": "MVP dev + Growth dev portion + (Monthly ops × 12) + Buffer",
      "lean_estimate": "₹20L-₹40L (bootstrap, minimal team)",
      "standard_estimate": "₹50L-₹1.2Cr (seed-funded, proper team)",
      "scale_estimate": "₹1.5Cr-₹4Cr (Series A, aggressive growth)",
      "explain_which_applies": "Based on project complexity and team requirements"
    },

    // ========================================
    // 💼 SCENARIO-BASED BUDGETS (REQUIRED)
    // ========================================
    "budget_scenarios": {
      "lean_startup": {
        "total_cost_inr": "CALCULATE based on: 2-3 person team, 8-12 months, minimal infra",
        "monthly_burn": "₹2L-₹4L",
        "runway_months": 12,
        "team_size": "2-3",
        "description": "Bootstrap mode: founder + junior dev(s), minimal marketing, home/coworking office",
        "tradeoffs": "Slower development, limited features, founder doing multiple roles"
      },
      "standard_startup": {
        "total_cost_inr": "CALCULATE based on: 5-8 person team, proper salaries, 12-18 months",
        "monthly_burn": "₹6L-₹12L",
        "runway_months": 18,
        "team_size": "5-8",
        "description": "Seed-funded: full dev team, dedicated designer, proper infrastructure",
        "ideal_funding": "₹1-2Cr seed round"
      },
      "well_funded": {
        "total_cost_inr": "CALCULATE based on: 12-20 person team, senior hires, aggressive timeline",
        "monthly_burn": "₹15L-₹35L",
        "runway_months": 24,
        "team_size": "12-20",
        "description": "Series A: full cross-functional team, aggressive marketing, premium everything",
        "ideal_funding": "₹10-25Cr Series A"
      }
    },

    // ========================================
    // 📊 BREAK-EVEN ANALYSIS
    // ========================================
    "break_even_analysis": {
      "customer_acquisition_cost": "₹500-₹5000 for B2B, ₹50-₹500 for B2C in India",
      "average_revenue_per_user": "CALCULATE based on pricing strategy",
      "months_to_break_even": "12-24 months typical for SaaS",
      "required_paying_customers": "CALCULATE: Monthly burn / ARPU",
      "detailed_analysis": "300-400 word analysis of path to profitability"
    },

    // ========================================
    // 🎯 FUNDING REQUIREMENTS
    // ========================================
    "funding_requirements": {
      "seed_round": "₹1-5Cr for 18-24 month runway to achieve PMF",
      "series_a": "₹10-50Cr for scaling after PMF proven",
      "recommended_approach": "Detailed 300-word funding strategy specific to this project"
    }
  },

  "time_planning": {
    "mvp_timeline": {
      "total_weeks": 12,
      "key_milestones": [
        {
          "week": 2,
          "milestone": "Architecture and setup complete"
        },
        {
          "week": 6,
          "milestone": "Core features implemented"
        },
        {
          "week": 10,
          "milestone": "Beta testing begins"
        },
        {
          "week": 12,
          "milestone": "MVP launch"
        }
      ]
    },
    "growth_phase_timeline": {
      "total_weeks": 24,
      "key_features_by_quarter": {
        "q1": ["Feature set 1"],
        "q2": ["Feature set 2"]
      }
    },
    "critical_path": ["Critical dependency 1", "Critical dependency 2"],
    "risk_buffers": "Built-in time buffers for unexpected issues (50-100 words)"
  },

  "impact_analysis": {
    "user_impact": "Qualitative description of user impact",
    "user_impact_score": <1-10>,
    "business_impact": "Qualitative description of business impact",
    "business_impact_score": <1-10>,
    "confidence_score": <0-1>,
    "time_to_value": "Estimated time to see impact",
    "affected_user_percentage": <0-100>,
    "revenue_impact": "Increase" | "Decrease" | "Neutral",
    "retention_impact": "Positive" | "Negative" | "Neutral",
    "market_impact": "How this affects the broader market (100-150 words)",
    "competitive_advantage": "Sustainable competitive advantages created (100-150 words)",
    "long_term_vision": "5-year vision and potential (150-200 words)"
  }
}

====================================
## ⚠️ CRITICAL NON-NEGOTIABLE REQUIREMENTS
====================================

### 1. JSON ONLY
- Output ONLY valid JSON
- NO markdown code blocks
- NO explanations before or after
- NO comments inside JSON

### 2. DEPTH REQUIREMENTS
- Every text field: ${depthConfig.descriptionLength}
- Problems: Generate ${depthConfig.minProblems}-${depthConfig.aimProblems} items
- Features: Generate ${depthConfig.minFeatures}-${depthConfig.aimFeatures} items
- Tasks: Generate ${depthConfig.minTasks}-${depthConfig.aimTasks} items

### 3. QUALITY STANDARDS
- Use SPECIFIC numbers, metrics, and data points
- Include REAL examples and case studies
- Cite REASONING for every decision
- Provide ACTIONABLE next steps
- Think like a $500K McKinsey report

### 4. COMPLETENESS
- ALL 13 sections must be present
- PRD must have ALL 14 sub-sections
- Every section must be COMPREHENSIVE
- No placeholders or "TBD" entries

### 5. PRODUCTION-READY
- Ready to hand to CEO/CTO
- Ready to use in board meetings
- Ready to present to investors
- Ready to guide engineering teams

====================================
## 🚀 OUTPUT NOW
====================================

Generate the complete JSON object. Push yourself to maximum detail. Think for 30-60 seconds before starting to ensure depth and quality.

START NOW. Output ONLY the JSON object.`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Analyze this product input and generate a COMPLETE, PRODUCTION-READY PRODUCT STRATEGY SYSTEM:

"""
${feedback}
"""

====================================
⚠️ MANDATORY REQUIREMENTS
====================================

**DEPTH LEVEL**: ${depthLevel.toUpperCase()}
**Description Length**: ${depthConfig.descriptionLength}

**MINIMUM OUTPUT**:
- ${depthConfig.minProblems}+ problems (AIM FOR ${depthConfig.aimProblems}+)
- ${depthConfig.minFeatures}+ features (AIM FOR ${depthConfig.aimFeatures}+)
- ${depthConfig.minTasks}+ tasks (AIM FOR ${depthConfig.aimTasks}+)

**PRD MUST INCLUDE ALL 14 SECTIONS**:
1. Product Overview (name, vision, mission, description)
2. Problem Statement (primary + secondary + evidence)
3. Objectives & Success Metrics (business + product + KPIs)
4. Target Users & Personas (market + 3-5 detailed personas + journey)
5. Features & Scope (requirements + in-scope + out-of-scope + future)
6. Functional Requirements (by module, very detailed)
7. Non-Functional Requirements (performance + security + scalability + usability + reliability)
8. Technical Requirements (architecture + frontend + backend + database + infrastructure + integrations)
9. UI/UX Requirements (flows + design system + principles)
10. Dependencies & Integrations (APIs + services + tools)
11. Constraints & Assumptions (technical + business + legal + timeline + budget)
12. Risks & Mitigation (10-15 identified risks with mitigation)
13. Testing & Validation (unit + integration + e2e + performance + security + UAT)
14. Launch & Rollout Plan (pre-launch + launch + post-launch + go/no-go criteria)

====================================
⚠️ FAILURE CONDITIONS (will cause rejection)
====================================

- Output fewer than minimums above
- Generic placeholder text
- Missing any of 13 main sections
- Missing any of 14 PRD sub-sections
- Shallow descriptions (< word counts specified)
- No specific numbers or metrics
- No reasoning or justification

====================================
🎯 FINAL REMINDER
====================================

You are generating a document worth $500,000 if done by consultants.
- Think DEEPLY (30-60 seconds)
- Generate EXHAUSTIVELY
- Be SPECIFIC with examples
- Include METRICS and numbers
- Make it PRODUCTION-READY

Output ONLY valid JSON. Start NOW.`,
    },
  ];
}

// ============================================
// RUN COMPREHENSIVE STRATEGY ANALYSIS
// ============================================

export async function runComprehensiveStrategyAnalysis(
  rawFeedback: string,
  context?: PipelineContext & { maxTokens?: number; timeout?: number }
): Promise<{
  success: boolean;
  result?: ComprehensiveStrategyResult;
  error?: string;
  provider?: string;
}> {
  const analysisStart = Date.now();
  const analysisId = `strategy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Use provided timeout or default
  const ANALYSIS_TIMEOUT = context?.timeout || 90000; // Default 90 seconds
  const maxTokens = context?.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS;
  const depth = context?.depth || 'long';

  logger.info('🚀 Starting Comprehensive Strategy Analysis', {
    analysisId,
    feedbackLength: rawFeedback.length,
    hasContext: !!context,
    depth,
    maxTokens,
    timeout: ANALYSIS_TIMEOUT,
  });

  try {
    // Race between AI analysis and timeout
    const analysisResult = await Promise.race([
      // AI Analysis
      (async () => {
        const messages = getComprehensiveStrategyPrompt(rawFeedback, context);

        logger.info('📤 Sending prompt to AI provider', {
          systemPromptLength: messages[0]?.content?.length || 0,
          userPromptLength: messages[1]?.content?.length || 0,
          maxTokens,
        });

        const { content, provider } = await callAI(messages, {
          temperature: 0.7,
          max_tokens: maxTokens,
          timeout: ANALYSIS_TIMEOUT - 5000, // Leave buffer
        });

        logger.info('📥 Received AI response', {
          provider,
          responseLength: content.length,
        });

        const rawResult = safeParseJSON<any>(content, null);

        if (!rawResult) {
          logger.error('Failed to parse AI response as JSON', {
            contentPreview: content.substring(0, 500),
          });
          throw new Error('Failed to parse AI response as JSON');
        }

        // Normalize the output to handle different AI provider schemas
        const normalizedResult = normalizeAIOutput(rawResult);

        return { rawResult: normalizedResult, provider };
      })(),

      // Timeout fallback
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout - using fallback')), ANALYSIS_TIMEOUT);
      })
    ]);

    // Validate minimum requirements
    const problems = analysisResult.rawResult.problem_analysis || [];
    const features = analysisResult.rawResult.feature_system || [];
    const tasks = analysisResult.rawResult.development_tasks || [];

    // Log output metrics
    logger.info('AI analysis output metrics', {
      problems: problems.length,
      features: features.length,
      tasks: tasks.length,
      provider: analysisResult.provider,
    });

    // Warn but don't fail if slightly under minimums
    if (problems.length < 10) {
      logger.warn(`Only ${problems.length} problems generated (minimum 10 recommended)`);
    }
    if (features.length < 15) {
      logger.warn(`Only ${features.length} features generated (minimum 15 recommended)`);
    }
    if (tasks.length < 25) {
      logger.warn(`Only ${tasks.length} tasks generated (minimum 25 recommended)`);
    }

    // Only trigger fallback if response is COMPLETELY empty (all sections zero)
    const totalOutputItems = (problems?.length ?? 0) + (features?.length ?? 0) + (tasks?.length ?? 0);
    
    if (totalOutputItems === 0) {
      logger.warn('AI output completely empty, using fallback analysis');
      throw new Error('No AI output generated');
    } else if (totalOutputItems < 20) {
      // Partial output - log warning but USE the real Gemini data
      logger.warn('⚠️ Partial AI output detected, proceeding with available data', {
        problems: problems?.length ?? 0,
        features: features?.length ?? 0,
        tasks: tasks?.length ?? 0,
        total: totalOutputItems,
        note: 'Using real AI output despite being below target minimums'
      });
      // Continue - do NOT trigger fallback for partial data
    }

    // Ensure IDs are set
    analysisResult.rawResult.problem_analysis = problems.map((p: any, i: number) => ({
      ...p,
      id: p.id || `PROB-${String(i + 1).padStart(3, '0')}`,
    }));

    analysisResult.rawResult.feature_system = features.map((f: any, i: number) => ({
      ...f,
      id: f.id || `FEAT-${String(i + 1).padStart(3, '0')}`,
    }));

    analysisResult.rawResult.development_tasks = tasks.map((t: any, i: number) => ({
      ...t,
      id: t.id || `TASK-${String(i + 1).padStart(3, '0')}`,
    }));

    // Add metadata
    const processingTime = Date.now() - analysisStart;
    const result: ComprehensiveStrategyResult = {
      ...analysisResult.rawResult,
      metadata: {
        analysis_id: analysisId,
        created_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        model_used: `${analysisResult.provider || 'AI'} (Comprehensive Strategy)`,
        input_length: rawFeedback.length,
      },
    };

    logger.info('Comprehensive Strategy Analysis Complete', {
      analysisId,
      processingTime,
      provider: analysisResult.provider,
      problems: problems.length,
      features: features.length,
      tasks: tasks.length,
    });

    return {
      success: true,
      result,
      provider: analysisResult.provider
    };

  } catch (error: any) {
    const processingTime = Date.now() - analysisStart;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // CHECK FOR CONFIG ERRORS - DO NOT GENERATE FALLBACK
    // Check both the flag AND the error message pattern for robustness
    const isConfigError = 
      error.isConfigError === true || 
      errorMessage.includes('GEMINI_CONFIG_ERROR') ||
      errorMessage.includes('Model not found') ||
      errorMessage.includes('Invalid API key') ||
      errorMessage.includes('Permission denied') ||
      errorMessage.includes('not found for API version');

    if (isConfigError) {
      logger.error('🚫 PROVIDER CONFIG ERROR - NOT USING FALLBACK', {
        error: errorMessage,
        processingTime,
        hint: 'Fix the AI provider configuration. This is not a transient error.',
        errorType: error.isConfigError ? 'flagged' : 'pattern-matched',
      });
      
      // Return failure, not fallback
      return {
        success: false,
        error: `AI Configuration Error: ${errorMessage}`,
        provider: 'none',
      };
    }

    logger.warn('AI analysis failed, using fallback system', {
      error: errorMessage,
      processingTime,
      errorType: 'transient',
    });

    // Generate fallback analysis ONLY for transient errors
    const fallbackResult = generateFallbackAnalysis(rawFeedback);

    // Update metadata
    fallbackResult.metadata = {
      ...fallbackResult.metadata,
      analysis_id: analysisId,
      processing_time_ms: processingTime,
    };

    logger.info('Fallback analysis generated successfully', {
      analysisId,
      problems: fallbackResult.problem_analysis?.length || 0,
      features: fallbackResult.feature_system?.length || 0,
      tasks: fallbackResult.development_tasks?.length || 0,
      processingTime
    });

    return {
      success: true,
      result: fallbackResult,
      provider: 'fallback',
    };
  }
}
