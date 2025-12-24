/**
 * Curated Prompt Templates Library
 * Professional, production-ready templates for common use cases
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  content: string;
  variables: string[];
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTokens: number;
  useCases: string[];
  tips: string[];
}

export type TemplateCategory = 
  | "customer_support"
  | "code_review"
  | "content_writing"
  | "data_analysis"
  | "translation"
  | "summarization"
  | "creative"
  | "business";

export const templateCategories: Record<TemplateCategory, { name: string; description: string; icon: string }> = {
  customer_support: {
    name: "Customer Support",
    description: "Templates for handling customer inquiries, complaints, and support tickets",
    icon: "headphones"
  },
  code_review: {
    name: "Code Review",
    description: "Templates for analyzing, reviewing, and improving code quality",
    icon: "code"
  },
  content_writing: {
    name: "Content Writing",
    description: "Templates for creating blog posts, articles, and marketing copy",
    icon: "pen-tool"
  },
  data_analysis: {
    name: "Data Analysis",
    description: "Templates for analyzing data and generating insights",
    icon: "bar-chart"
  },
  translation: {
    name: "Translation",
    description: "Templates for translating content between languages",
    icon: "globe"
  },
  summarization: {
    name: "Summarization",
    description: "Templates for condensing long content into key points",
    icon: "file-text"
  },
  creative: {
    name: "Creative Writing",
    description: "Templates for storytelling, brainstorming, and creative tasks",
    icon: "sparkles"
  },
  business: {
    name: "Business",
    description: "Templates for emails, proposals, and professional communication",
    icon: "briefcase"
  }
};

export const promptTemplates: PromptTemplate[] = [
  // Customer Support Templates
  {
    id: "cs-ticket-response",
    name: "Support Ticket Response",
    description: "Generate professional, empathetic responses to customer support tickets",
    category: "customer_support",
    content: `You are a helpful customer support agent for {{company_name}}. Your goal is to provide clear, empathetic, and solution-oriented responses.

Customer Ticket:
{{ticket_content}}

Customer Sentiment: {{sentiment}}
Priority Level: {{priority}}

Guidelines:
1. Acknowledge the customer's concern with empathy
2. Provide a clear explanation or solution
3. If you cannot resolve immediately, explain next steps
4. End with an offer to help further

Respond in a professional yet friendly tone. Keep the response concise but thorough.`,
    variables: ["company_name", "ticket_content", "sentiment", "priority"],
    tags: ["support", "customer service", "tickets", "empathy"],
    difficulty: "beginner",
    estimatedTokens: 250,
    useCases: [
      "Responding to customer complaints",
      "Handling product inquiries",
      "Processing refund requests",
      "Technical support responses"
    ],
    tips: [
      "Always acknowledge the customer's feelings first",
      "Provide specific next steps when possible",
      "Use the customer's name if available"
    ]
  },
  {
    id: "cs-escalation-summary",
    name: "Escalation Summary",
    description: "Create concise summaries for escalating issues to senior support or management",
    category: "customer_support",
    content: `Create a professional escalation summary for the following customer issue.

Customer Information:
- Name: {{customer_name}}
- Account Type: {{account_type}}
- Customer Since: {{customer_since}}

Issue History:
{{issue_history}}

Current Status: {{current_status}}

Generate a structured escalation summary including:
1. Issue Overview (2-3 sentences)
2. Timeline of Events
3. Actions Taken So Far
4. Recommended Resolution
5. Business Impact Assessment
6. Urgency Level Justification`,
    variables: ["customer_name", "account_type", "customer_since", "issue_history", "current_status"],
    tags: ["escalation", "management", "summary", "priority"],
    difficulty: "intermediate",
    estimatedTokens: 400,
    useCases: [
      "Escalating complex issues",
      "Management briefings",
      "Cross-team handoffs"
    ],
    tips: [
      "Include all relevant context for the receiving team",
      "Be objective and factual in the summary",
      "Clearly state the expected outcome"
    ]
  },

  // Code Review Templates
  {
    id: "cr-code-review",
    name: "Comprehensive Code Review",
    description: "Perform thorough code reviews with actionable feedback",
    category: "code_review",
    content: `You are a senior software engineer performing a code review. Analyze the following code and provide constructive feedback.

Language: {{language}}
Context: {{context}}

Code to Review:
\`\`\`{{language}}
{{code}}
\`\`\`

Provide a comprehensive review covering:

1. **Code Quality**
   - Readability and clarity
   - Naming conventions
   - Code organization

2. **Potential Issues**
   - Bugs or logic errors
   - Edge cases not handled
   - Security vulnerabilities

3. **Performance**
   - Efficiency concerns
   - Memory usage
   - Scalability issues

4. **Best Practices**
   - Design patterns
   - SOLID principles
   - Language-specific idioms

5. **Suggestions**
   - Specific improvements with code examples
   - Alternative approaches

Rate the overall code quality: [1-10] with justification.`,
    variables: ["language", "context", "code"],
    tags: ["code review", "quality", "best practices", "security"],
    difficulty: "advanced",
    estimatedTokens: 800,
    useCases: [
      "Pull request reviews",
      "Code quality audits",
      "Mentoring junior developers",
      "Pre-deployment checks"
    ],
    tips: [
      "Be specific with line numbers when pointing out issues",
      "Always provide examples for suggested improvements",
      "Balance criticism with positive feedback"
    ]
  },
  {
    id: "cr-bug-analysis",
    name: "Bug Analysis & Fix",
    description: "Analyze buggy code and suggest fixes with explanations",
    category: "code_review",
    content: `Analyze the following code that contains a bug and provide a detailed analysis.

Language: {{language}}
Expected Behavior: {{expected_behavior}}
Actual Behavior: {{actual_behavior}}

Buggy Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Error Message (if any): {{error_message}}

Provide:
1. **Root Cause Analysis**: Explain why the bug occurs
2. **Step-by-Step Fix**: Show the corrected code with explanations
3. **Prevention Tips**: How to avoid similar bugs in the future
4. **Test Cases**: Suggest test cases to verify the fix`,
    variables: ["language", "expected_behavior", "actual_behavior", "code", "error_message"],
    tags: ["debugging", "bug fix", "analysis", "testing"],
    difficulty: "intermediate",
    estimatedTokens: 500,
    useCases: [
      "Debugging production issues",
      "Learning from mistakes",
      "Code improvement"
    ],
    tips: [
      "Include the error message for better analysis",
      "Describe both expected and actual behavior clearly"
    ]
  },

  // Content Writing Templates
  {
    id: "cw-blog-post",
    name: "SEO Blog Post",
    description: "Generate engaging, SEO-optimized blog posts",
    category: "content_writing",
    content: `Write an engaging, SEO-optimized blog post on the following topic.

Topic: {{topic}}
Target Audience: {{target_audience}}
Primary Keyword: {{primary_keyword}}
Secondary Keywords: {{secondary_keywords}}
Desired Word Count: {{word_count}}
Tone: {{tone}}

Structure the post with:
1. **Compelling Title** (include primary keyword)
2. **Meta Description** (150-160 characters)
3. **Introduction** (hook the reader, introduce the problem)
4. **Main Sections** (H2 headings with keyword variations)
5. **Practical Examples/Tips**
6. **Conclusion** (summarize key points, call to action)

SEO Guidelines:
- Use primary keyword in first 100 words
- Include keywords naturally throughout
- Use short paragraphs (2-3 sentences)
- Add bullet points for scannability
- Include internal/external link suggestions`,
    variables: ["topic", "target_audience", "primary_keyword", "secondary_keywords", "word_count", "tone"],
    tags: ["blog", "SEO", "content marketing", "writing"],
    difficulty: "intermediate",
    estimatedTokens: 1200,
    useCases: [
      "Company blog posts",
      "Thought leadership content",
      "Product announcements",
      "Industry insights"
    ],
    tips: [
      "Research competitor content for the keyword first",
      "Include specific data or statistics when possible",
      "Add a clear call-to-action at the end"
    ]
  },
  {
    id: "cw-product-description",
    name: "Product Description",
    description: "Create compelling product descriptions that convert",
    category: "content_writing",
    content: `Write a compelling product description that drives conversions.

Product Name: {{product_name}}
Product Category: {{category}}
Key Features: {{features}}
Target Customer: {{target_customer}}
Price Point: {{price_point}}
Unique Selling Points: {{usp}}

Create a description that includes:
1. **Headline** - Attention-grabbing, benefit-focused
2. **Opening Hook** - Address the customer's pain point
3. **Feature-Benefit Breakdown** - Transform features into benefits
4. **Social Proof Placeholder** - Where to add testimonials
5. **Urgency Element** - Create desire to act
6. **Call to Action** - Clear next step

Tone: Professional yet conversational
Length: 150-200 words for main description`,
    variables: ["product_name", "category", "features", "target_customer", "price_point", "usp"],
    tags: ["e-commerce", "product", "copywriting", "conversion"],
    difficulty: "beginner",
    estimatedTokens: 350,
    useCases: [
      "E-commerce listings",
      "Product launches",
      "Catalog descriptions"
    ],
    tips: [
      "Focus on benefits, not just features",
      "Use sensory language when appropriate",
      "Include specific numbers and details"
    ]
  },

  // Data Analysis Templates
  {
    id: "da-data-insights",
    name: "Data Insights Generator",
    description: "Extract meaningful insights from data summaries",
    category: "data_analysis",
    content: `Analyze the following data and provide actionable insights.

Data Context: {{context}}
Time Period: {{time_period}}
Key Metrics: {{metrics}}

Data Summary:
{{data_summary}}

Comparison Baseline (if applicable): {{baseline}}

Provide analysis including:

1. **Executive Summary** (3-4 key findings)

2. **Trend Analysis**
   - Identify patterns and trends
   - Note any anomalies or outliers
   - Compare to baseline/previous period

3. **Key Insights**
   - What's working well?
   - What needs attention?
   - Unexpected findings

4. **Recommendations**
   - Immediate actions (this week)
   - Short-term improvements (this month)
   - Strategic considerations (this quarter)

5. **Questions for Further Investigation**

Format numbers with appropriate precision and include percentage changes where relevant.`,
    variables: ["context", "time_period", "metrics", "data_summary", "baseline"],
    tags: ["analytics", "insights", "reporting", "business intelligence"],
    difficulty: "advanced",
    estimatedTokens: 600,
    useCases: [
      "Monthly business reviews",
      "Marketing campaign analysis",
      "Sales performance reports",
      "Product metrics review"
    ],
    tips: [
      "Provide context for what 'good' looks like",
      "Include comparison data when available",
      "Be specific about the time period"
    ]
  },

  // Translation Templates
  {
    id: "tr-professional",
    name: "Professional Translation",
    description: "Translate content while preserving tone and context",
    category: "translation",
    content: `Translate the following content from {{source_language}} to {{target_language}}.

Content Type: {{content_type}}
Target Audience: {{target_audience}}
Formality Level: {{formality}}

Original Text:
{{text}}

Translation Guidelines:
1. Preserve the original meaning and intent
2. Adapt idioms and cultural references appropriately
3. Maintain the tone and style of the original
4. Use terminology appropriate for the target audience
5. Flag any terms that may need localization review

Provide:
1. **Translation**: The translated text
2. **Notes**: Any cultural adaptations made
3. **Alternatives**: Alternative phrasings for key terms (if applicable)`,
    variables: ["source_language", "target_language", "content_type", "target_audience", "formality", "text"],
    tags: ["translation", "localization", "multilingual"],
    difficulty: "intermediate",
    estimatedTokens: 400,
    useCases: [
      "Marketing content localization",
      "Technical documentation",
      "Customer communications",
      "Legal documents"
    ],
    tips: [
      "Specify the dialect if relevant (e.g., Brazilian Portuguese vs European)",
      "Provide context about the brand voice",
      "Note any terms that should not be translated"
    ]
  },

  // Summarization Templates
  {
    id: "sm-meeting-notes",
    name: "Meeting Notes Summary",
    description: "Transform meeting transcripts into actionable summaries",
    category: "summarization",
    content: `Summarize the following meeting transcript into a structured, actionable format.

Meeting Type: {{meeting_type}}
Participants: {{participants}}
Date: {{date}}

Transcript:
{{transcript}}

Create a summary with:

1. **Meeting Overview**
   - Purpose
   - Duration
   - Key attendees

2. **Key Discussion Points**
   - Main topics covered
   - Important decisions made
   - Concerns raised

3. **Action Items**
   | Owner | Task | Deadline |
   |-------|------|----------|
   (Extract all action items with owners and deadlines)

4. **Decisions Made**
   - List all decisions with context

5. **Open Questions/Parking Lot**
   - Items needing follow-up
   - Unresolved discussions

6. **Next Steps**
   - Next meeting date (if mentioned)
   - Preparation needed`,
    variables: ["meeting_type", "participants", "date", "transcript"],
    tags: ["meetings", "summary", "action items", "productivity"],
    difficulty: "beginner",
    estimatedTokens: 500,
    useCases: [
      "Team meetings",
      "Client calls",
      "Project standups",
      "Board meetings"
    ],
    tips: [
      "Include speaker names in the transcript if possible",
      "Note the meeting type for appropriate formatting",
      "Highlight any deadlines mentioned"
    ]
  },
  {
    id: "sm-document-summary",
    name: "Document Summary",
    description: "Create concise summaries of long documents",
    category: "summarization",
    content: `Create a comprehensive summary of the following document.

Document Type: {{document_type}}
Target Summary Length: {{summary_length}}
Focus Areas: {{focus_areas}}

Document:
{{document}}

Provide:

1. **One-Sentence Summary**
   - Capture the essence in one sentence

2. **Key Points** (bullet format)
   - Main arguments or findings
   - Supporting evidence
   - Conclusions

3. **Detailed Summary** ({{summary_length}} words)
   - Structured overview of the content
   - Focus on {{focus_areas}}

4. **Notable Quotes**
   - Important direct quotes (if any)

5. **Implications/Takeaways**
   - What this means for the reader
   - Recommended actions`,
    variables: ["document_type", "summary_length", "focus_areas", "document"],
    tags: ["summary", "documents", "research", "reading"],
    difficulty: "beginner",
    estimatedTokens: 450,
    useCases: [
      "Research paper summaries",
      "Report digests",
      "Book chapter summaries",
      "Policy document reviews"
    ],
    tips: [
      "Specify what aspects are most important to you",
      "Indicate the desired summary length",
      "Mention if technical terms should be simplified"
    ]
  },

  // Creative Templates
  {
    id: "cr-brainstorm",
    name: "Creative Brainstorming",
    description: "Generate creative ideas and solutions for any challenge",
    category: "creative",
    content: `Help brainstorm creative solutions for the following challenge.

Challenge: {{challenge}}
Context: {{context}}
Constraints: {{constraints}}
Target Outcome: {{target_outcome}}

Generate ideas using multiple thinking approaches:

1. **Conventional Solutions** (3-5 ideas)
   - Proven approaches that typically work

2. **Unconventional Solutions** (3-5 ideas)
   - Creative, outside-the-box thinking

3. **Combination Ideas** (2-3 ideas)
   - Merge concepts from different domains

4. **"What If" Scenarios**
   - What if we had unlimited budget?
   - What if we had to solve this in 24 hours?
   - What if we approached this from the opposite direction?

5. **Top 3 Recommendations**
   - Best ideas with implementation considerations
   - Pros and cons for each
   - Quick wins vs. long-term solutions`,
    variables: ["challenge", "context", "constraints", "target_outcome"],
    tags: ["brainstorming", "creativity", "problem solving", "innovation"],
    difficulty: "beginner",
    estimatedTokens: 600,
    useCases: [
      "Product ideation",
      "Marketing campaigns",
      "Problem solving sessions",
      "Strategic planning"
    ],
    tips: [
      "Don't filter ideas too early",
      "Include constraints to make ideas more practical",
      "Describe the ideal outcome clearly"
    ]
  },

  // Business Templates
  {
    id: "bs-email-professional",
    name: "Professional Email",
    description: "Craft professional emails for any business situation",
    category: "business",
    content: `Write a professional email for the following situation.

Purpose: {{purpose}}
Recipient: {{recipient}}
Relationship: {{relationship}}
Key Points to Cover: {{key_points}}
Desired Outcome: {{desired_outcome}}
Tone: {{tone}}

Create an email with:
1. **Subject Line** - Clear and action-oriented
2. **Greeting** - Appropriate for the relationship
3. **Opening** - Context or purpose statement
4. **Body** - Key points in logical order
5. **Call to Action** - Clear next steps
6. **Closing** - Professional sign-off

Guidelines:
- Keep paragraphs short (2-3 sentences)
- Use bullet points for multiple items
- Be concise but complete
- Match formality to the relationship`,
    variables: ["purpose", "recipient", "relationship", "key_points", "desired_outcome", "tone"],
    tags: ["email", "communication", "professional", "business"],
    difficulty: "beginner",
    estimatedTokens: 300,
    useCases: [
      "Client communications",
      "Internal announcements",
      "Follow-up emails",
      "Request emails"
    ],
    tips: [
      "Be specific about the desired outcome",
      "Indicate the relationship for appropriate tone",
      "List all key points to ensure nothing is missed"
    ]
  },
  {
    id: "bs-proposal-outline",
    name: "Business Proposal",
    description: "Create compelling business proposals and pitches",
    category: "business",
    content: `Create a business proposal for the following opportunity.

Client/Audience: {{client}}
Problem/Need: {{problem}}
Proposed Solution: {{solution}}
Budget Range: {{budget}}
Timeline: {{timeline}}
Competitive Advantage: {{advantage}}

Generate a proposal including:

1. **Executive Summary**
   - Problem statement
   - Proposed solution overview
   - Key benefits
   - Investment summary

2. **Understanding of Needs**
   - Client's challenges
   - Impact of the problem
   - Goals and objectives

3. **Proposed Solution**
   - Detailed approach
   - Methodology
   - Deliverables

4. **Why Us**
   - Relevant experience
   - Unique qualifications
   - Competitive advantages

5. **Investment & Timeline**
   - Pricing breakdown
   - Payment terms
   - Project milestones

6. **Next Steps**
   - Call to action
   - Contact information`,
    variables: ["client", "problem", "solution", "budget", "timeline", "advantage"],
    tags: ["proposal", "sales", "business development", "pitch"],
    difficulty: "advanced",
    estimatedTokens: 800,
    useCases: [
      "Client proposals",
      "RFP responses",
      "Partnership pitches",
      "Internal project proposals"
    ],
    tips: [
      "Focus on client benefits, not just features",
      "Include specific numbers and timelines",
      "Address potential objections proactively"
    ]
  }
];

// Helper functions
export function getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
  return promptTemplates.filter(t => t.category === category);
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  return promptTemplates.find(t => t.id === id);
}

export function searchTemplates(query: string): PromptTemplate[] {
  const lowerQuery = query.toLowerCase();
  return promptTemplates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getTemplatesByDifficulty(difficulty: PromptTemplate["difficulty"]): PromptTemplate[] {
  return promptTemplates.filter(t => t.difficulty === difficulty);
}
