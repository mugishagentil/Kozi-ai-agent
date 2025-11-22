"""Simple test to check quick.rw response"""
import requests
from tools.web_scraper_utils import get_headers

r = requests.get('https://www.quick.rw', headers=get_headers(), timeout=15)
print('Status:', r.status_code)
print('Content-Type:', r.headers.get('Content-Type'))
print('Content-Encoding:', r.headers.get('Content-Encoding'))
print('Content Length (text):', len(r.text))
print('Content Length (raw):', len(r.content))
print('\nFirst 1000 chars of response.text:')
print(r.text[:1000])
print('\n--- Checking if HTML ---')
if '<html' in r.text.lower() or '<!doctype' in r.text.lower():
    print('✅ Contains HTML')
else:
    print('❌ Does not contain HTML - might be compressed or binary')

