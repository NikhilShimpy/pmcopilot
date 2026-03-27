/**
 * Workspace Demo Page - Showcase the new chat-first UI
 * Access at: /workspace
 */

'use client'

import { useEffect } from 'react'
import { ChatFirstLayout, DragDropProvider } from '@/components/chat-first'
import { useChatFirstStore } from '@/stores/chatFirstStore'

export default function WorkspaceDemoPage() {
  const { addMessage, setProject } = useChatFirstStore()

  // Add demo messages on mount
  useEffect(() => {
    setProject('demo-project', 'Food Delivery Platform')

    // Add a sample conversation after a short delay
    const timer = setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `# Project Analysis Complete

I've analyzed your food delivery platform idea. Here's what I found:

## Executive Summary
A mobile-first food delivery platform targeting tier-2 and tier-3 cities in India with focus on local restaurants and affordable pricing.

## Key Problems Identified (8 total)

### 1. Long Delivery Times in Peak Hours
- **Severity:** High (8/10)
- **Frequency:** Daily
- **Root Cause:** Insufficient delivery fleet and poor route optimization
- **Affected Users:** 78% of active users

### 2. Limited Restaurant Options
- **Severity:** Medium (6/10)
- **Frequency:** Weekly
- **Root Cause:** Onboarding process too complex for small vendors
- **Affected Users:** New users in emerging areas

### 3. Payment Failures
- **Severity:** High (9/10)
- **Frequency:** 5% of transactions
- **Root Cause:** UPI integration issues during peak load
- **Affected Users:** All users

---

## Recommended Features (15 total)

### 1. Smart Route Optimization
- **Business Value:** High
- **Complexity:** Medium
- **Estimated Time:** 6-8 weeks
- Reduces delivery time by 25%

### 2. Simplified Vendor Onboarding
- **Business Value:** High
- **Complexity:** Low
- **Estimated Time:** 3-4 weeks
- Increase restaurant coverage by 40%

### 3. Redundant Payment Gateway
- **Business Value:** Critical
- **Complexity:** Medium
- **Estimated Time:** 4-5 weeks
- Reduce payment failures to <1%

---

## Cost Estimation (INR)

### MVP Phase (3 months)
| Category | Monthly Cost |
|----------|-------------|
| **Development Team** | ₹8,50,000 |
| - 2 Senior Developers | ₹3,00,000 |
| - 3 Mid-level Developers | ₹2,70,000 |
| - 1 UI/UX Designer | ₹1,50,000 |
| - 1 QA Engineer | ₹1,30,000 |
| **Infrastructure** | ₹45,000 |
| - AWS (ap-south-1) | ₹35,000 |
| - Third-party APIs | ₹10,000 |
| **Tools & Services** | ₹25,000 |
| | |
| **Total Monthly** | **₹9,20,000** |
| **Total MVP (3 months)** | **₹27,60,000** |

### Growth Phase (6 months)
- Team expansion: +₹4,00,000/month
- Infrastructure scaling: +₹1,50,000/month
- Marketing budget: ₹5,00,000/month
- **Total:** ₹85,00,000

---

## Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Week 1-2 | Setup | Architecture, CI/CD, Database |
| Week 3-6 | Core Features | User auth, Restaurant listing, Cart |
| Week 7-9 | Integrations | Payment, Maps, Notifications |
| Week 10-12 | Polish | Testing, Performance, UAT |

---

## Next Steps

1. **Finalize tech stack** - React Native vs Flutter
2. **Vendor partnerships** - Start pilot with 20 restaurants
3. **Payment provider** - Compare Razorpay vs PayU
4. **Delivery fleet** - Partner with existing services or build own

---

*Ask me anything about this analysis! You can also drag specific items to get detailed breakdowns.*`,
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [addMessage, setProject])

  return (
    <DragDropProvider>
      <ChatFirstLayout
        projectId="demo-project"
        projectName="Food Delivery Platform"
      />
    </DragDropProvider>
  )
}
