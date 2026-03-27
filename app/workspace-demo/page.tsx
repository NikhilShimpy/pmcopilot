import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'

export default function WorkspaceDemoPage() {
  // Mock data for testing
  const mockProject = {
    id: 'demo-1',
    name: 'Demo Project - E-commerce Platform',
    description: 'Testing new workspace with realistic data',
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Mock comprehensive analysis with realistic data
  const mockAnalysis = {
    executive_dashboard: {
      idea_expansion: "A modern e-commerce platform that provides personalized shopping experiences",
      key_insight: "Current platforms lack personalized recommendations",
      innovation_score: 8,
      market_opportunity: "₹2.5 Cr market opportunity in India",
      complexity_level: 'High' as const,
      recommended_strategy: "Focus on AI-powered personalization and mobile-first design"
    },
    problems: [
      {
        id: "p1",
        title: "Poor Search Experience",
        deep_description: "Users struggle to find relevant products with current search functionality",
        root_cause: "Basic keyword matching without semantic understanding",
        affected_users: "80% of daily active users",
        current_solutions: "Simple text search",
        gaps_in_market: "No AI-powered semantic search",
        why_existing_fails: "Doesn't understand user intent",
        severity_score: 9,
        frequency_score: 8,
        business_impact: "30% cart abandonment due to poor search",
        technical_difficulty: 'High' as const,
        evidence_examples: ["Users search 'phone' but get phone cases", "Zero results for common queries"]
      },
      {
        id: "p2",
        title: "Slow Page Load Times",
        deep_description: "Product pages take 5+ seconds to load, causing user frustration",
        root_cause: "Unoptimized images and heavy JavaScript bundles",
        affected_users: "All mobile users (70% of traffic)",
        current_solutions: "Basic CDN",
        gaps_in_market: "Modern image optimization",
        why_existing_fails: "No lazy loading or modern formats",
        severity_score: 8,
        frequency_score: 10,
        business_impact: "40% bounce rate on mobile",
        technical_difficulty: 'Medium' as const,
        evidence_examples: ["5.2s average load time", "Users leave before page loads"]
      },
      {
        id: "p3",
        title: "Limited Payment Options",
        deep_description: "Only supports credit cards, excluding many Indian customers",
        root_cause: "Integration with only 2 payment gateways",
        affected_users: "50% of potential customers in Tier 2/3 cities",
        current_solutions: "Credit card and debit card only",
        gaps_in_market: "UPI, wallets, BNPL options",
        why_existing_fails: "Doesn't cater to Indian payment preferences",
        severity_score: 7,
        frequency_score: 6,
        business_impact: "25% conversion rate loss",
        technical_difficulty: 'Medium' as const,
        evidence_examples: ["Users abandon at payment", "Support requests for UPI"]
      }
    ],
    features: [
      {
        id: "f1",
        name: "AI-Powered Search",
        category: 'core' as const,
        detailed_description: "Semantic search using NLP to understand user intent",
        why_needed: "To solve poor search experience and improve product discovery",
        linked_problems: ["p1"],
        user_value: "Find products faster with natural language",
        business_value: "15% increase in conversions",
        implementation_strategy: ["Integrate Elasticsearch with NLP", "Train on user behavior"],
        technical_requirements: ["Elasticsearch cluster", "ML model training pipeline"],
        dependencies: ["Search infrastructure upgrade"],
        complexity: 'High' as const,
        estimated_dev_time: "8-10 weeks"
      },
      {
        id: "f2",
        name: "Image Optimization Pipeline",
        category: 'core' as const,
        detailed_description: "Automatic image compression and modern format conversion",
        why_needed: "To improve page load speeds and user experience",
        linked_problems: ["p2"],
        user_value: "Faster page loads, better mobile experience",
        business_value: "20% reduction in bounce rate",
        implementation_strategy: ["Implement WebP conversion", "Add lazy loading"],
        technical_requirements: ["CDN with image processing", "Progressive loading"],
        dependencies: ["CDN upgrade"],
        complexity: 'Medium' as const,
        estimated_dev_time: "4-6 weeks"
      },
      {
        id: "f3",
        name: "UPI & Wallet Integration",
        category: 'core' as const,
        detailed_description: "Support for UPI, PhonePe, GPay, and other Indian payment methods",
        why_needed: "To capture the Indian market and reduce payment friction",
        linked_problems: ["p3"],
        user_value: "Pay with preferred method",
        business_value: "30% increase in successful checkouts",
        implementation_strategy: ["Integrate Razorpay", "Add wallet APIs"],
        technical_requirements: ["Payment gateway integration", "Security compliance"],
        dependencies: ["PCI compliance"],
        complexity: 'Medium' as const,
        estimated_dev_time: "3-4 weeks"
      },
      {
        id: "f4",
        name: "Personalized Recommendations",
        category: 'advanced' as const,
        detailed_description: "ML-based product recommendations based on user behavior",
        why_needed: "To increase cross-selling and user engagement",
        linked_problems: [],
        user_value: "Discover relevant products effortlessly",
        business_value: "25% increase in average order value",
        implementation_strategy: ["Collaborative filtering", "Content-based recommendations"],
        technical_requirements: ["ML pipeline", "Real-time inference"],
        dependencies: ["User analytics system"],
        complexity: 'High' as const,
        estimated_dev_time: "10-12 weeks"
      }
    ],
    tasks: [
      {
        id: "t1",
        title: "Set up Elasticsearch cluster",
        description: "Configure Elasticsearch for semantic search functionality",
        category: "Infrastructure",
        priority: "High",
        estimated_hours: 16,
        dependencies: ["Search requirements analysis"],
        acceptance_criteria: ["Cluster running in production", "Index mapping defined"],
        assignee_role: "DevOps Engineer",
        sprint_allocation: "Sprint 1"
      },
      {
        id: "t2",
        title: "Implement image compression API",
        description: "Build service to automatically compress and convert images to WebP",
        category: "Backend",
        priority: "High",
        estimated_hours: 24,
        dependencies: ["CDN setup"],
        acceptance_criteria: ["Images compressed by 60%", "WebP format support"],
        assignee_role: "Backend Developer",
        sprint_allocation: "Sprint 1"
      },
      {
        id: "t3",
        title: "Integrate Razorpay UPI",
        description: "Add UPI payment option through Razorpay gateway",
        category: "Frontend",
        priority: "Medium",
        estimated_hours: 20,
        dependencies: ["PCI compliance review"],
        acceptance_criteria: ["UPI payments working", "Error handling complete"],
        assignee_role: "Frontend Developer",
        sprint_allocation: "Sprint 2"
      },
      {
        id: "t4",
        title: "Design search UI components",
        description: "Create autocomplete, filters, and results components",
        category: "Frontend",
        priority: "Medium",
        estimated_hours: 28,
        dependencies: ["UI/UX wireframes"],
        acceptance_criteria: ["Responsive design", "Accessibility compliant"],
        assignee_role: "Frontend Developer",
        sprint_allocation: "Sprint 1"
      },
      {
        id: "t5",
        title: "Train recommendation model",
        description: "Build and train ML model for product recommendations",
        category: "ML",
        priority: "Low",
        estimated_hours: 40,
        dependencies: ["User data collection"],
        acceptance_criteria: ["Model accuracy >75%", "Real-time inference <100ms"],
        assignee_role: "ML Engineer",
        sprint_allocation: "Sprint 3"
      }
    ]
  }

  // Temporarily disabled - needs update to match new ComprehensiveStrategyResult type
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Workspace Demo
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          This demo page is being updated. Please use the main application flow.
        </p>
      </div>
    </div>
  )

  // return <WorkspaceLayout project={mockProject} analysisResult={mockAnalysis} />
}