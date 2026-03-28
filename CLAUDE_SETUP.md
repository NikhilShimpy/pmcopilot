# Claude AI Provider Setup Guide

## Problem Solved ✅

Your system was experiencing **cascading AI provider failures**:
- ❌ **Gemini**: Free tier quota exceeded (0 requests remaining)
- ❌ **Groq**: Daily token limit reached (99,476/100,000 tokens used)

This caused the system to fall back to basic analysis instead of generating real AI-powered insights.

---

## Solution: Three-Provider Fallback Chain 🔄

The system now supports **three AI providers** in this priority order:

```
PRIMARY     → FALLBACK 1    → FALLBACK 2
Gemini      → Groq         → Claude
(Google)    (Open Source)   (Anthropic)
```

If one provider fails or is rate-limited, the system automatically tries the next one.

---

## Setup Instructions

### Option 1: Use Claude (RECOMMENDED) ⭐

If you have an **Anthropic Claude API key**, add it to enable Claude as a backup:

1. **Get your Claude API key:**
   - Visit: https://console.anthropic.com/account/keys
   - Create a new API key
   - Copy the key value (starts with `sk-ant-...`)

2. **Add to .env.local:**
   ```
   CLAUDE_API_KEY=sk-ant-your-actual-key-here
   ```

3. **Restart your server** (the changes will be picked up automatically)

4. **Test it:**
   - Go to your app and trigger an analysis
   - You should see in the logs: `claudeAvailable: true`
   - If Gemini and Groq fail, Claude will handle the request

**Cost:** Claude is a paid API ($3-15/month for typical usage)

---

### Option 2: Upgrade Your Existing Providers

#### Upgrade Gemini (Free → Paid)
- Visit: https://console.cloud.google.com/billing
- Set up a billing account
- Free tier quota will be reset to higher limits

**Cost:** Pay-as-you-go ($15/million input tokens, $60/million output tokens)

#### Upgrade Groq (Free → Dev Tier)
- Visit: https://console.groq.com/settings/billing
- Upgrade to **Dev Tier** for 10x more daily tokens
- Or switch to **Paid Tier** for unlimited tokens

**Cost:** $0-99/month depending on tier

---

### Option 3: Wait for Rate Limits to Reset

**Gemini:** Free tier resets after 24 hours  
**Groq:** Daily token limit resets at midnight UTC  

Recovery times from current logs:
- Gemini rate-limited until: 2026-03-27T18:59:13Z (~30 seconds)
- Groq token limit resets: ~2h 36m from current timestamp

---

## How It Works

### Automatic Failover
When analyzing user feedback:

```javascript
// Priority chain
1. Try Gemini (if not rate-limited)
   - 3 attempts with backoff
   - On success → Return result ✅

2. If Gemini fails → Try Groq
   - 2 attempts with backoff
   - On success → Return result ✅

3. If Groq fails → Try Claude (if key configured)
   - 2 attempts with backoff
   - On success → Return result ✅

4. If ALL fail → Use fallback analysis
   - Basic keyword extraction + templated analysis
   - No AI used (current behavior when you see "fallback")
```

### Rate Limit Handling

The system tracks rate limit errors with **exponential backoff**:
- 1st error: Wait 30 seconds
- 2nd error: Wait 60 seconds  
- 3rd error: Wait 120 seconds
- Maximum: 5 minutes

This prevents hammering rate-limited APIs.

---

## Current Status

### What's Implemented ✅

| Feature | Status |
|---------|--------|
| Gemini Support | ✅ Active |
| Groq Support | ✅ Active |
| Claude Support | ✅ Ready (needs API key) |
| Rate Limit Tracking | ✅ Automatic |
| Fallback Chain | ✅ 3-provider chain |
| Exponential Backoff | ✅ Implemented |
| JSON Parsing | ✅ All formats supported |

### Configuration File Changes

**Updated files:**
- `lib/config.ts` - Added Claude config
- `lib/aiEngine.ts` - Added Claude API client
- `utils/constants.ts` - Added Claude endpoints
- `.env.local` - Added CLAUDE_API_KEY placeholder  
- `types/index.ts` - Updated EnvironmentConfig

---

## Troubleshooting

### "Claude API key not configured" 
- Add your Claude API key to `.env.local`: `CLAUDE_API_KEY=sk-ant-...`
- Restart the server
- Check logs for `claudeAvailable: true`

### All providers showing rate limit errors
- Check your current rate limit status by looking at logs
- Option 1: Wait for limits to reset (see timestamps in logs)
- Option 2: Add Claude API key as backup
- Option 3: Upgrade your Gemini/Groq plans

### Fallback analysis still being used
This means all AI providers are rate-limited or failing. 
- Check `.env.local` for valid API keys
- Verify internet connection
- Check rate limit status in server logs

---

## Next Steps

### Recommended: Add Claude
1. Get API key from https://console.anthropic.com/account/keys
2. Add to `.env.local`
3. Restart server
4. Test with your next analysis request

### Alternative: Upgrade Groq
Groq is free but has daily limits. Upgrading gives you:
- Higher daily token limits (50k → 500k+)
- Priority support
- Faster response times

### Monitor Usage
Watch the server logs for provider changes:
```
[INFO] 🚀 Starting AI provider chain {
  geminiAvailable: true,   ← Can use Gemini?
  groqAvailable: true,     ← Can use Groq?
  claudeAvailable: true,   ← Can use Claude?
}
```

---

## Cost Comparison

| Provider | Tier | Cost | Limits |
|----------|------|------|--------|
| **Gemini** | Free | $0 | 15 req/min |
| Gemini | Paid | $3/M tokens | Unlimited |
| **Groq** | Free | $0 | 100k tokens/day |
| Groq | Dev | $29/month | 10x tokens |
| **Claude** | Paid | $3-15/month avg | Based on usage |

*M = million*

---

## Questions?

Check the logs for detailed error messages:
```bash
# View current rate limit status
grep "Rate limit recorded" logs

# See provider chain attempts
grep "Starting AI provider chain" logs

# Debug individual provider calls
grep "Calling.*API" logs
```

For more info about:
- **Gemini quotas**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Groq limits**: https://console.groq.com/keys
- **Claude pricing**: https://www.anthropic.com/pricing

---

**Last Updated:** March 27, 2026  
**System Version:** v3.0 with Claude Support
