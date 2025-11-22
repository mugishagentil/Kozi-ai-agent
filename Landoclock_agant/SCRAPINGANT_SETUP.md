# ScrapingAnt Integration Guide

## Overview

ScrapingAnt has been integrated into the web scrapers to handle JavaScript-rendered content and bypass anti-bot measures. This significantly improves the reliability of scraping Rwanda real estate websites.

## Benefits

- ✅ **JavaScript Rendering**: Handles dynamic content loaded by JavaScript
- ✅ **Anti-Bot Bypass**: Uses rotating proxies and browser automation
- ✅ **Better Reliability**: More successful scraping of modern websites
- ✅ **Graceful Fallback**: Automatically falls back to regular requests if ScrapingAnt is unavailable

## Setup

### 1. Get ScrapingAnt API Key

1. Visit [https://scrapingant.com/](https://scrapingant.com/)
2. Sign up for a free account (10,000 API credits/month)
3. Get your API key from the dashboard

### 2. Add to Environment Variables

Add to your `.env` file:

```env
SCRAPINGANT_API_KEY=your_scrapingant_api_key_here
```

### 3. Install Dependencies

The required packages are already in `requirements.txt`:

```bash
pip install -r requirements.txt
```

This installs:
- `scrapingant-client>=1.0.0`
- `langchain-community>=0.3.0`

## How It Works

The scrapers now use a **two-tier approach**:

1. **Primary**: Try ScrapingAnt first (if API key is configured)
   - Uses headless browser rendering
   - Handles JavaScript-rendered content
   - Bypasses anti-bot measures

2. **Fallback**: Use regular `requests` library if ScrapingAnt:
   - Is not configured (no API key)
   - Fails for any reason
   - Is unavailable

## Integration Details

### Modified Files

- `Backend/tools/web_scraper_utils.py`
  - Added `scrape_with_scrapingant()` function
  - Handles multiple ScrapingAnt API methods for compatibility

- `Backend/tools/mcp_web_scraper.py`
  - Updated all three scrapers:
    - `scrape_quick_rw_properties()`
    - `scrape_kwanda_properties()`
    - `search_house_in_rwanda()`
  - Each scraper now tries ScrapingAnt first, then falls back to requests

### Scrapers Affected

1. **Quick Homes Rwanda** (`quick.rw`)
2. **Kwanda Real Estate** (`kwandarealestate.com`)
3. **House in Rwanda** (`houseinrwanda.com`)

## Usage

No code changes needed! The integration is automatic:

- If `SCRAPINGANT_API_KEY` is set → Uses ScrapingAnt
- If not set → Uses regular requests (works as before)

## Testing

Test the integration:

```bash
cd Backend
python test_mcp_scraper.py
```

Or test the aggregator:

```bash
python test_property_aggregator.py
```

## API Credits

ScrapingAnt uses API credits:
- **Free Plan**: 10,000 credits/month
- **Default Cost**: ~10 credits per request (with browser rendering)
- **Free Plan Capacity**: ~1,000 requests/month

Each property search typically makes 1-3 requests (one per website), so the free plan should handle hundreds of searches per month.

## Troubleshooting

### ScrapingAnt Not Working

If ScrapingAnt fails, the system automatically falls back to regular requests. Check:

1. **API Key**: Ensure `SCRAPINGANT_API_KEY` is set in `.env`
2. **Credits**: Check your ScrapingAnt dashboard for remaining credits
3. **Logs**: Check console output for ScrapingAnt error messages

### Still Getting Errors

If scraping still fails:
1. The website structure may have changed
2. The website may be temporarily down
3. Check the error messages for specific issues

The system will provide helpful error messages suggesting:
- Direct website visits
- Alternative platforms
- Manual search suggestions

## Cost Optimization

To reduce API credit usage:
- ScrapingAnt is only used when needed (JavaScript-heavy sites)
- Failed ScrapingAnt requests automatically fall back to free requests
- Consider upgrading to a paid plan if you need more than 1,000 requests/month

## Support

For ScrapingAnt issues:
- Documentation: [https://docs.scrapingant.com/](https://docs.scrapingant.com/)
- Support: [support@scrapingant.com](mailto:support@scrapingant.com)

For integration issues:
- Check the error logs
- Verify environment variables
- Test individual scrapers with `test_mcp_scraper.py`

