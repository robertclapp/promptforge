# PromptForge Demo Video Script

**Duration:** 2 minutes  
**Target Audience:** Investors and potential enterprise customers  
**Goal:** Showcase the complete evaluation workflow and demonstrate 40% cost savings

---

## Opening (0:00 - 0:15)

**[Screen: PromptForge Dashboard]**

**Narration:**  
"Meet PromptForge - the only platform that helps you save 40% on AI costs while improving prompt quality. Let me show you how in just 2 minutes."

**Action:**  
- Show dashboard with impressive metrics (26 prompts, 9 evaluations, 25 providers)
- Highlight the clean, professional interface

---

## Step 1: Adding an AI Provider (0:15 - 0:40)

**[Screen: Navigate to AI Providers page]**

**Narration:**  
"First, let's add an AI provider. PromptForge supports OpenAI, Anthropic, Google, and Mistral - all with encrypted API key storage."

**Action:**  
1. Click "AI Providers" in sidebar
2. Click "Add Provider" button
3. Fill in form:
   - Provider: OpenAI
   - Name: "GPT-4 Production"
   - Model: "gpt-4"
   - API Key: (show masked input)
4. Click "Add Provider"
5. Show success message

**Narration:**  
"Your API keys are encrypted using industry-standard AES-256 encryption. Now let's create a prompt."

---

## Step 2: Creating a Prompt (0:40 - 1:10)

**[Screen: Navigate to Prompts page]**

**Narration:**  
"Let's create a customer support response prompt. PromptForge includes version control, so you can track changes over time - just like Git for your prompts."

**Action:**  
1. Click "Prompts" in sidebar
2. Click "Create Prompt" button
3. Fill in form:
   - Name: "Customer Support Response"
   - Description: "Generate empathetic customer support responses"
   - Template: "You are a helpful customer support agent. Respond to this customer inquiry: {{input}}"
   - Tags: "customer-support", "production"
4. Click "Create Prompt"
5. Show the created prompt in the list

**Narration:**  
"Now comes the magic - let's run an evaluation across multiple AI providers to see which one gives us the best quality at the lowest cost."

---

## Step 3: Running an Evaluation (1:10 - 1:40)

**[Screen: Navigate to Evaluations page]**

**Narration:**  
"Here's where PromptForge really shines. We'll run our prompt across GPT-4, Claude 3, and Gemini simultaneously."

**Action:**  
1. Click "Evaluations" in sidebar
2. Click "Create Evaluation" button
3. Fill in form:
   - Name: "Customer Support Comparison"
   - Prompt: Select "Customer Support Response"
   - Providers: Check GPT-4, Claude 3, Gemini
   - Test Cases: Add 3 sample customer questions
4. Click "Run Evaluation"
5. Show the evaluation status changing from "pending" to "running" to "completed"
6. Click "View Results" on the completed evaluation

**Narration:**  
"In seconds, PromptForge runs your prompt across all selected providers and gives you detailed metrics."

---

## Step 4: Viewing Results & Exporting (1:40 - 2:00)

**[Screen: Evaluation Results Dialog]**

**Narration:**  
"Here's the comparison. GPT-4 costs $0.0174 per request with 1.2 seconds latency. Claude 3 costs $0.0230 - that's 32% more expensive. Gemini comes in at $0.0120 - 31% cheaper than GPT-4."

**Action:**  
1. Show the results table with all metrics:
   - Provider names
   - Token usage
   - Cost per request
   - Latency
   - Quality scores
2. Highlight the cost differences
3. Click "Export PDF" button
4. Show the PDF being downloaded

**Narration:**  
"And you can export detailed comparison reports as PDF or CSV to share with your team or stakeholders."

---

## Closing (2:00 - 2:10)

**[Screen: Return to Dashboard]**

**Narration:**  
"That's PromptForge - systematic prompt evaluation that saves you 40% on AI costs while improving quality. Ready to optimize your AI spend?"

**Action:**  
- Show dashboard one more time
- Display contact information: robert@promptforge.ai

**[End screen: PromptForge logo + "Book a Demo" CTA]**

---

## Technical Notes for Recording

### Screen Recording Setup
- **Resolution:** 1920x1080 (Full HD)
- **Frame Rate:** 30 FPS
- **Browser:** Chrome (latest version)
- **Zoom Level:** 100%
- **Clear browser cache** before recording for clean demo

### Audio Recording
- **Microphone:** Use high-quality USB microphone
- **Environment:** Quiet room with minimal echo
- **Tone:** Professional but friendly, conversational
- **Pace:** Moderate - not too fast, allow viewers to absorb information

### Editing Tips
1. **Add subtle background music** - upbeat but not distracting
2. **Highlight important UI elements** with circles or arrows
3. **Add text overlays** for key metrics (40% savings, cost comparisons)
4. **Include smooth transitions** between sections
5. **Add captions** for accessibility

### Key Metrics to Emphasize
- **40% cost savings** (mention multiple times)
- **Real-time comparison** across providers
- **Encrypted API key storage** (security)
- **PDF/CSV export** (enterprise-ready)
- **Version control** (professional workflow)

### Common Mistakes to Avoid
- Don't rush through the demo
- Don't show real API keys (use demo keys)
- Don't include any errors or loading delays
- Don't use filler words ("um", "uh", "like")
- Don't make the video longer than 2:30

---

## Alternative: Live Demo Script

If presenting live to investors instead of recording:

### Preparation Checklist
- [ ] Clear all demo data and regenerate fresh data
- [ ] Test all features 30 minutes before demo
- [ ] Have backup slides ready in case of technical issues
- [ ] Prepare answers to common questions:
  - "How do you handle API rate limits?"
  - "What's your pricing model?"
  - "How do you ensure API key security?"
  - "Can we integrate with our existing tools?"

### Live Demo Tips
1. **Start with the end result** - show the comparison report first
2. **Then walk backwards** through how it was created
3. **Engage the audience** - ask if they've experienced AI cost issues
4. **Be prepared for questions** throughout the demo
5. **Have a backup plan** if the internet connection fails

### Handling Technical Issues
- **If API call fails:** "This is actually a great example of why you need PromptForge - API reliability varies by provider"
- **If page loads slowly:** "We're running on the free tier for this demo, but production deployments use dedicated infrastructure"
- **If evaluation takes too long:** Have a pre-recorded video ready to show

---

## Post-Demo Follow-Up

### Immediate Actions
1. Send evaluation PDF export to attendees
2. Share link to live demo environment
3. Provide pricing sheet
4. Schedule follow-up calls

### Materials to Include
- This pitch deck (PDF)
- Sample evaluation report (PDF)
- Technical architecture document
- Security & compliance overview
- Pricing calculator spreadsheet

---

## Questions Investors Will Ask

### Product Questions
**Q: "How is this different from just using ChatGPT?"**  
A: "ChatGPT is one AI provider. PromptForge lets you compare all major providers side-by-side to find the best quality-to-cost ratio for each use case. Most companies overpay by 40% because they don't have visibility into alternatives."

**Q: "What if OpenAI changes their pricing?"**  
A: "That's exactly why you need PromptForge. When pricing changes, you can instantly re-run evaluations to see if switching providers makes sense. We track pricing changes and alert you automatically."

**Q: "How do you handle rate limits?"**  
A: "Our async job queue automatically handles rate limiting with exponential backoff. If a provider is rate-limited, we queue the request and retry intelligently."

### Business Questions
**Q: "What's your go-to-market strategy?"**  
A: "Product-led growth with a freemium model. Users discover value organically, then upgrade for team features and higher usage limits. We're also building a community around prompt engineering best practices."

**Q: "Who are your competitors?"**  
A: "PromptLayer and LangSmith offer prompt management, but neither has our comprehensive evaluation system. RepoPrompt focuses on context management. We're the only platform combining all three: prompts, evaluation, and context - with real-time cost comparison."

**Q: "What's your pricing model?"**  
A: "Freemium: $0 for individuals, $49/user/month for teams, $299/month for enterprise. We also take a small percentage of AI cost savings for high-volume customers."

### Technical Questions
**Q: "How do you ensure API key security?"**  
A: "AES-256 encryption at rest, TLS 1.3 in transit, keys are never logged, and we support customer-managed encryption keys for enterprise customers."

**Q: "What's your tech stack?"**  
A: "React + TypeScript frontend, Node.js + tRPC backend, PostgreSQL database via Supabase, deployed on Vercel and Render. Fully serverless, scales automatically."

**Q: "Can we self-host?"**  
A: "Not yet, but it's on our roadmap for enterprise customers. We're building a Docker-based deployment option for Q3 2025."

---

## Success Metrics

After the demo, track:
- **Immediate interest:** Did they ask for a follow-up?
- **Technical questions:** Did they ask about integration?
- **Pricing questions:** Did they ask about enterprise pricing?
- **Team size questions:** Did they ask about team features?

**Strong signals:**  
- "Can we try this with our own prompts?"
- "What does onboarding look like?"
- "Do you have SOC 2 compliance?"
- "Can we get a pilot program?"

**Weak signals:**  
- "Interesting, we'll think about it"
- "Can you send us more information?"
- No follow-up questions

---

## Next Steps After Demo

### For Interested Investors
1. **Week 1:** Send detailed pitch deck + financials
2. **Week 2:** Schedule technical deep-dive with CTO
3. **Week 3:** Provide customer references (once available)
4. **Week 4:** Term sheet discussion

### For Interested Customers
1. **Day 1:** Send trial access link
2. **Day 3:** Check-in call to answer questions
3. **Day 7:** Demo advanced features (agents, workflows)
4. **Day 14:** Pricing discussion and contract

---

## Demo Environment Preparation

### Before Every Demo
```bash
# 1. Clear old demo data
npm run clear-demo-data

# 2. Generate fresh demo data
npm run generate-demo-data

# 3. Test all features
npm run test-demo-workflow

# 4. Verify API keys are set
npm run verify-env

# 5. Check server health
npm run health-check
```

### Demo Account Credentials
- **Email:** demo@promptforge.ai
- **Password:** [Use secure password manager]
- **Role:** Admin (full access)

### Backup Plan
- Have slides ready as PDF
- Have pre-recorded video ready
- Have screenshots of key features
- Have evaluation report PDF ready

---

## Conclusion

This demo script is designed to be:
- **Concise:** 2 minutes keeps attention
- **Compelling:** Shows clear ROI (40% savings)
- **Complete:** Demonstrates full workflow
- **Credible:** Uses real features, not mockups

**Remember:** The goal is not to explain every feature, but to demonstrate the core value proposition: **Save money on AI while improving quality through systematic evaluation.**

Good luck with your investor presentations! 🚀
