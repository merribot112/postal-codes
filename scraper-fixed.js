#!/usr/bin/env node

/**
 * FIXED Posti Postinumerohaku Scraper (Puppeteer)
 * Correctly extracts municipalities and address counts
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const POSTAL_CODES_FILE = path.join(__dirname, 'postal_codes.txt');
const DATA_DIR = path.join(__dirname, 'data');
const POSTI_URL = 'https://www.posti.fi/postinumerohaku';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPostalCodes() {
  const content = fs.readFileSync(POSTAL_CODES_FILE, 'utf-8');
  return content.split('\n').filter(line => line.trim());
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePostalCode(page, postalCode) {
  try {
    // Type in the search field
    const inputSelector = 'input[placeholder*="Hae osoitteella"]';
    await page.type(inputSelector, postalCode);
    
    // Wait for dropdown to appear with options
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    await delay(300);
    
    // Get all options from dropdown
    const options = await page.$$('[role="option"]');
    const municipalities = [];
    
    for (const option of options) {
      const text = await page.evaluate(el => el.textContent, option);
      const trimmed = text.trim();
      
      // Skip the "Results for..." option and empty text
      if (trimmed && !trimmed.startsWith('Tulokset haulle')) {
        // Extract municipality name from "XXXXX MUNICIPALITYNAME" format
        const parts = trimmed.split(/\s+/);
        if (parts.length > 1) {
          const municipality = parts.slice(1).join(' ');
          if (municipality && !municipalities.includes(municipality)) {
            municipalities.push(municipality);
          }
        }
      }
    }
    
    let totalAddresses = null;
    
    // If we have municipalities, click the first one to get result count
    if (municipalities.length > 0) {
      try {
        const firstOption = await page.$('[role="option"]');
        if (firstOption) {
          await firstOption.click();
          
          // Wait for results to load
          await delay(1000);
          
          // Extract total address count from heading
          // Format: "Hakutulokset (Yhteensä 2044 tulosta)"
          try {
            const headingText = await page.$eval('h2', el => el.textContent);
            const match = headingText.match(/Yhteensä\s+(\d+)/);
            if (match) {
              totalAddresses = parseInt(match[1]);
            }
          } catch (e) {
            // If heading not found, that's ok
          }
        }
      } catch (e) {
        // Error getting count, continue anyway
      }
    }
    
    return {
      postal_code: postalCode,
      municipalities: municipalities,
      total_addresses: totalAddresses,
      scraped_at: new Date().toISOString(),
      success: municipalities.length > 0
    };
  } catch (error) {
    return {
      postal_code: postalCode,
      error: error.message,
      scraped_at: new Date().toISOString(),
      success: false
    };
  }
}

async function main() {
  const postalCodes = loadPostalCodes();
  const total = postalCodes.length;
  
  console.log(`📍 Scraping ${total} postal codes from Posti postinumerohaku`);
  console.log(`💾 Saving to ${DATA_DIR}/\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  
  try {
    await page.goto(POSTI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.error('❌ Failed to load Posti website:', e.message);
    await browser.close();
    process.exit(1);
  }
  
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < postalCodes.length; i++) {
    const postalCode = postalCodes[i];
    const progress = `[${String(i + 1).padStart(3)}/${total}]`;
    
    process.stdout.write(`${progress} ${postalCode}... `);
    
    try {
      // Clear search field
      const inputSelector = 'input[placeholder*="Hae osoitteella"]';
      await page.evaluate(() => {
        document.querySelector('input[placeholder*="Hae osoitteella"]').value = '';
      });
      await delay(200);
      
      const data = await scrapePostalCode(page, postalCode);
      
      // Save result
      const outputFile = path.join(DATA_DIR, `${postalCode}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
      
      if (data.success) {
        successful++;
        console.log(`✅ ${data.municipalities.join('/')} - ${data.total_addresses || '?'} addresses`);
      } else {
        failed++;
        console.log(`⚠️  ${data.error || 'No data'}`);
      }
      
      // Rate limiting
      await delay(1500);
    } catch (error) {
      failed++;
      console.log(`❌ ${error.message}`);
      await delay(1500);
    }
  }
  
  await browser.close();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📊 Success rate: ${((successful/total)*100).toFixed(1)}%`);
  console.log(`📁 Results saved to ${DATA_DIR}/`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
