const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const POSTAL_CODES_FILE = '/home/molt/.openclaw/workspace/postal_codes/postal_codes.txt';
const OUTPUT_DIR = '/home/molt/.openclaw/workspace/postal_codes/data';
const RATE_LIMIT_MS = 1000; // 1 second between requests

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read postal codes
const postalCodes = fs.readFileSync(POSTAL_CODES_FILE, 'utf-8')
  .split('\n')
  .map(code => code.trim())
  .filter(code => code.length > 0);

console.log(`📍 Starting scraper for ${postalCodes.length} postal codes`);

(async () => {
  let browser;
  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (let i = 0; i < postalCodes.length; i++) {
      const postalCode = postalCodes[i];
      console.log(`[${i + 1}/${postalCodes.length}] Processing ${postalCode}...`);

      try {
        const page = await browser.newPage();
        
        // Navigate to the search page with postal code
        const searchUrl = `https://www.posti.fi/postinumerohaku?postinumero=${postalCode}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for results to load
        await page.waitForSelector('.result-item, [class*="result"], [class*="osoite"], table, tr', { timeout: 5000 }).catch(() => {});

        // Extract all data from the page
        const pageData = await page.evaluate((postalCodeParam) => {
          const results = {
            municipalities: new Set(),
            addresses: [],
            pageText: document.body.innerText.substring(0, 5000)
          };

          // Try to find all result items
          const items = document.querySelectorAll('tr, .result-item, [class*="result"], .address, [class*="address"]');
          
          items.forEach(item => {
            const text = (item.textContent || '').trim();
            if (text.length > 2 && text.length < 200) {
              results.addresses.push(text);
              
              // Try to extract municipality names (usually in caps, Finnish/Swedish)
              const munMatch = text.match(/([A-ZÄÖÅ]+)/g);
              if (munMatch) {
                munMatch.forEach(m => {
                  if (m.length > 2 && m.length < 30 && !m.match(/^\d+$/)) {
                    results.municipalities.add(m);
                  }
                });
              }
            }
          });

          return {
            municipalities: Array.from(results.municipalities).slice(0, 10),
            addressCount: results.addresses.length,
            pageText: results.pageText
          };
        }, postalCode);

        // Count unique addresses (removing duplicates)
        let totalAddresses = pageData.addressCount || 0;

        // Try to find count in the page text
        const pageText = pageData.pageText;
        const countMatches = pageText.match(/(\d+)\s*(osoite|address|katu|street)/gi);
        if (countMatches && countMatches.length > 0) {
          const numbers = countMatches.map(m => {
            const num = m.match(/(\d+)/);
            return num ? parseInt(num[1], 10) : 0;
          });
          totalAddresses = Math.max(...numbers) || totalAddresses;
        }

        // Get municipality from page content
        let municipalities = pageData.municipalities || [];
        
        // Try to also get it from the page title or any municipal info
        const pageTitle = await page.evaluate(() => {
          return document.title || '';
        });
        
        if (pageTitle && pageTitle.length > 0) {
          const titleMun = pageTitle.match(/([A-ZÄÖÅ\s]+)/);
          if (titleMun) {
            municipalities.push(titleMun[0].trim());
          }
        }

        // Clean up municipalities
        municipalities = municipalities
          .map(m => m.trim().toUpperCase())
          .filter(m => m.length > 2 && m.length < 50 && m !== postalCode)
          .filter((v, i, a) => a.indexOf(v) === i); // unique

        const result = {
          postal_code: postalCode,
          municipalities: municipalities.slice(0, 5),
          total_addresses: totalAddresses,
          scraped_at: new Date().toISOString()
        };

        // Save to JSON file
        const outputFile = path.join(OUTPUT_DIR, `${postalCode}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

        console.log(`✓ ${postalCode}: ${municipalities.join(', ') || 'N/A'} (${totalAddresses} addresses)`);
        successCount++;

        await page.close();

        // Rate limiting
        if (i < postalCodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
        }

      } catch (error) {
        console.error(`✗ ${postalCode}: ${error.message}`);
        failures.push({ postalCode, error: error.message });
        failureCount++;
        
        // Still create a file to mark attempt
        const outputFile = path.join(OUTPUT_DIR, `${postalCode}.json`);
        fs.writeFileSync(outputFile, JSON.stringify({
          postal_code: postalCode,
          municipalities: [],
          total_addresses: 0,
          scraped_at: new Date().toISOString(),
          error: error.message
        }, null, 2));
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`✓ Successful: ${successCount}/${postalCodes.length}`);
    console.log(`✗ Failed: ${failureCount}/${postalCodes.length}`);

    if (failures.length > 0 && failures.length <= 10) {
      console.log('\n❌ Failures:');
      failures.forEach(f => {
        console.log(`  - ${f.postalCode}: ${f.error}`);
      });
    } else if (failures.length > 10) {
      console.log(`\n❌ ${failures.length} failures (showing first 10):`);
      failures.slice(0, 10).forEach(f => {
        console.log(`  - ${f.postalCode}: ${f.error}`);
      });
    }

    // Sample results
    console.log('\n📋 Sample results (first 5):');
    const dataFiles = fs.readdirSync(OUTPUT_DIR).sort().slice(0, 5);
    dataFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
        console.log(`\n${file}:`);
        console.log(JSON.stringify(data, null, 2));
      }
    });

    process.exit(failureCount > postalCodes.length * 0.5 ? 1 : 0);
  }
})();
