/**
 * Localization Utilities - India-focused pricing and formatting
 * Provides INR formatting, salary ranges, and realistic cost estimation
 */

export interface INRPricing {
  amount: number
  formatted: string
  salaryRange?: {
    min: number
    max: number
    monthly: string
    annual: string
  }
}

export interface SalaryBand {
  min: number
  max: number
  level: string
}

/**
 * Format amount in Indian Rupee format
 * Examples: ₹1,00,000 | ₹10,50,000 | ₹1.5Cr
 */
export function formatINR(amount: number, compact: boolean = false): string {
  if (compact) {
    if (amount >= 10000000) {
      // 1 Crore and above
      const crores = amount / 10000000
      return `₹${crores.toFixed(1)}Cr`
    } else if (amount >= 100000) {
      // 1 Lakh and above
      const lakhs = amount / 100000
      return `₹${lakhs.toFixed(1)}L`
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get salary range based on role and seniority level
 * All values in INR per annum
 */
export function getSalaryRange(
  role: string,
  level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' = 'Mid'
): INRPricing['salaryRange'] {
  // Salary bands by role (INR per annum)
  const salaryBands: Record<string, Record<string, SalaryBand>> = {
    'Frontend Developer': {
      Junior: { min: 400000, max: 800000, level: 'Junior (0-2 years)' },
      Mid: { min: 800000, max: 1500000, level: 'Mid (2-5 years)' },
      Senior: { min: 1500000, max: 2500000, level: 'Senior (5-8 years)' },
      Lead: { min: 2500000, max: 4000000, level: 'Lead (8+ years)' },
      Principal: { min: 4000000, max: 6000000, level: 'Principal (10+ years)' },
    },
    'Backend Developer': {
      Junior: { min: 500000, max: 900000, level: 'Junior (0-2 years)' },
      Mid: { min: 900000, max: 1800000, level: 'Mid (2-5 years)' },
      Senior: { min: 1800000, max: 3000000, level: 'Senior (5-8 years)' },
      Lead: { min: 3000000, max: 4500000, level: 'Lead (8+ years)' },
      Principal: { min: 4500000, max: 7000000, level: 'Principal (10+ years)' },
    },
    'Full Stack Developer': {
      Junior: { min: 450000, max: 850000, level: 'Junior (0-2 years)' },
      Mid: { min: 850000, max: 1600000, level: 'Mid (2-5 years)' },
      Senior: { min: 1600000, max: 2700000, level: 'Senior (5-8 years)' },
      Lead: { min: 2700000, max: 4200000, level: 'Lead (8+ years)' },
      Principal: { min: 4200000, max: 6500000, level: 'Principal (10+ years)' },
    },
    'Product Manager': {
      Junior: { min: 600000, max: 1000000, level: 'APM (0-2 years)' },
      Mid: { min: 1000000, max: 2000000, level: 'PM (2-5 years)' },
      Senior: { min: 2000000, max: 3500000, level: 'Senior PM (5-8 years)' },
      Lead: { min: 3500000, max: 5000000, level: 'Lead PM (8+ years)' },
      Principal: { min: 5000000, max: 8000000, level: 'Principal PM (10+ years)' },
    },
    'UI/UX Designer': {
      Junior: { min: 350000, max: 600000, level: 'Junior (0-2 years)' },
      Mid: { min: 600000, max: 1200000, level: 'Mid (2-5 years)' },
      Senior: { min: 1200000, max: 2000000, level: 'Senior (5-8 years)' },
      Lead: { min: 2000000, max: 3000000, level: 'Lead (8+ years)' },
      Principal: { min: 3000000, max: 5000000, level: 'Principal (10+ years)' },
    },
    'DevOps Engineer': {
      Junior: { min: 500000, max: 900000, level: 'Junior (0-2 years)' },
      Mid: { min: 900000, max: 1700000, level: 'Mid (2-5 years)' },
      Senior: { min: 1700000, max: 2800000, level: 'Senior (5-8 years)' },
      Lead: { min: 2800000, max: 4300000, level: 'Lead (8+ years)' },
      Principal: { min: 4300000, max: 6500000, level: 'Principal (10+ years)' },
    },
    'QA Engineer': {
      Junior: { min: 350000, max: 650000, level: 'Junior (0-2 years)' },
      Mid: { min: 650000, max: 1200000, level: 'Mid (2-5 years)' },
      Senior: { min: 1200000, max: 2000000, level: 'Senior (5-8 years)' },
      Lead: { min: 2000000, max: 3000000, level: 'Lead (8+ years)' },
      Principal: { min: 3000000, max: 4500000, level: 'Principal (10+ years)' },
    },
    'Data Scientist': {
      Junior: { min: 600000, max: 1000000, level: 'Junior (0-2 years)' },
      Mid: { min: 1000000, max: 2000000, level: 'Mid (2-5 years)' },
      Senior: { min: 2000000, max: 3500000, level: 'Senior (5-8 years)' },
      Lead: { min: 3500000, max: 5500000, level: 'Lead (8+ years)' },
      Principal: { min: 5500000, max: 8500000, level: 'Principal (10+ years)' },
    },
    'AI/ML Engineer': {
      Junior: { min: 700000, max: 1200000, level: 'Junior (0-2 years)' },
      Mid: { min: 1200000, max: 2200000, level: 'Mid (2-5 years)' },
      Senior: { min: 2200000, max: 3800000, level: 'Senior (5-8 years)' },
      Lead: { min: 3800000, max: 6000000, level: 'Lead (8+ years)' },
      Principal: { min: 6000000, max: 9000000, level: 'Principal (10+ years)' },
    },
  }

  const band = salaryBands[role]?.[level] || {
    min: 500000,
    max: 1000000,
    level: 'Mid',
  }

  const monthlyMin = band.min / 12
  const monthlyMax = band.max / 12

  return {
    min: band.min,
    max: band.max,
    monthly: `${formatINR(monthlyMin, true)} - ${formatINR(monthlyMax, true)}/mo`,
    annual: `${formatINR(band.min, true)} - ${formatINR(band.max, true)}/year`,
  }
}

/**
 * Convert USD to INR with current rate
 * Default rate: 83 (approximate as of 2024)
 */
export function convertUSDToINR(usd: number, rate: number = 83): number {
  return Math.round(usd * rate)
}

/**
 * Estimate infrastructure costs for India region
 * Returns monthly cost in INR
 */
export function estimateInfraCost(
  stage: 'mvp' | 'growth' | 'scale'
): {
  hosting: number
  database: number
  storage: number
  cdn: number
  monitoring: number
  cicd: number
  total: number
  breakdown: string[]
} {
  const costs = {
    mvp: {
      hosting: 5000, // AWS t3.small or GCP e2-small
      database: 3000, // Managed PostgreSQL small instance
      storage: 500, // 100GB S3/GCS
      cdn: 1000, // CloudFlare or AWS CloudFront
      monitoring: 0, // Free tier (Sentry, DataDog free)
      cicd: 0, // GitHub Actions free tier
    },
    growth: {
      hosting: 15000, // 2x t3.medium instances
      database: 12000, // Managed PostgreSQL medium + read replica
      storage: 2000, // 500GB
      cdn: 3000, // Higher bandwidth
      monitoring: 5000, // Paid monitoring tools
      cicd: 2000, // Paid CI/CD
    },
    scale: {
      hosting: 50000, // Auto-scaling group, load balancer
      database: 35000, // High-availability setup
      storage: 8000, // 2TB + backups
      cdn: 10000, // Global CDN
      monitoring: 15000, // Full observability stack
      cicd: 5000, // Advanced CI/CD
    },
  }

  const cost = costs[stage]
  const total = Object.values(cost).reduce((sum, val) => sum + val, 0)

  const breakdown = [
    `Hosting (${stage === 'mvp' ? '1 instance' : stage === 'growth' ? '2 instances' : 'Auto-scaling'}): ${formatINR(cost.hosting)}/mo`,
    `Database (${stage === 'mvp' ? 'Small' : stage === 'growth' ? 'Medium + Replica' : 'HA Setup'}): ${formatINR(cost.database)}/mo`,
    `Storage: ${formatINR(cost.storage)}/mo`,
    `CDN: ${formatINR(cost.cdn)}/mo`,
    `Monitoring: ${cost.monitoring === 0 ? 'Free tier' : formatINR(cost.monitoring) + '/mo'}`,
    `CI/CD: ${cost.cicd === 0 ? 'Free tier' : formatINR(cost.cicd) + '/mo'}`,
  ]

  return {
    ...cost,
    total,
    breakdown,
  }
}

/**
 * Estimate AI API costs (OpenAI, Anthropic, etc.)
 * Returns monthly cost in INR based on usage
 */
export function estimateAICost(
  monthlyRequests: number,
  avgTokensPerRequest: number = 1000
): {
  gpt4: number
  gpt35: number
  claude: number
  gemini: number
  recommended: string
  breakdown: string[]
} {
  const usdToInr = 83

  // Pricing per 1M tokens (USD)
  const pricing = {
    gpt4: 30, // GPT-4 Turbo
    gpt35: 1.5, // GPT-3.5 Turbo
    claude: 15, // Claude 3 Sonnet
    gemini: 0.5, // Gemini Pro (Google)
  }

  const totalTokens = (monthlyRequests * avgTokensPerRequest) / 1000000

  const costs = {
    gpt4: Math.round(totalTokens * pricing.gpt4 * usdToInr),
    gpt35: Math.round(totalTokens * pricing.gpt35 * usdToInr),
    claude: Math.round(totalTokens * pricing.claude * usdToInr),
    gemini: Math.round(totalTokens * pricing.gemini * usdToInr),
  }

  const breakdown = [
    `GPT-4 Turbo: ${formatINR(costs.gpt4)}/mo (High quality, expensive)`,
    `GPT-3.5 Turbo: ${formatINR(costs.gpt35)}/mo (Good quality, affordable)`,
    `Claude 3 Sonnet: ${formatINR(costs.claude)}/mo (Balanced)`,
    `Gemini Pro: ${formatINR(costs.gemini)}/mo (Most affordable)`,
  ]

  return {
    ...costs,
    recommended: 'Use GPT-3.5 for MVP, upgrade to GPT-4/Claude for production',
    breakdown,
  }
}

/**
 * Calculate team burn rate
 * Returns monthly and annual burn in INR
 */
export function calculateBurnRate(team: Array<{ role: string; level: string; count: number }>): {
  monthly: number
  annual: number
  breakdown: Array<{ role: string; count: number; salary: string; total: number }>
} {
  const breakdown = team.map((member) => {
    const range = getSalaryRange(member.role, member.level as any)
    if (!range) {
      // Fallback for unknown role/level combinations
      const fallbackRange = { min: 600000, max: 1200000, monthly: '₹50,000 - ₹1,00,000', annual: '₹6,00,000 - ₹12,00,000' }
      const avgAnnual = (fallbackRange.min + fallbackRange.max) / 2
      const total = avgAnnual * member.count
      return {
        role: member.role,
        count: member.count,
        salary: fallbackRange.annual,
        total,
      }
    }

    const avgAnnual = (range.min + range.max) / 2
    const total = avgAnnual * member.count

    return {
      role: member.role,
      count: member.count,
      salary: range.annual,
      total,
    }
  })

  const annual = breakdown.reduce((sum, item) => sum + item.total, 0)
  const monthly = annual / 12

  return {
    monthly,
    annual,
    breakdown,
  }
}

export default {
  formatINR,
  getSalaryRange,
  convertUSDToINR,
  estimateInfraCost,
  estimateAICost,
  calculateBurnRate,
}
