#!/usr/bin/env node

/**
 * Complete Postal Code Scraper - Proper zero-padded format
 * Extracts all addresses and classifies as POST_BOX or SETTLEMENT
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const POSTAL_CODES_FILE = path.join(__dirname, '..', 'postal_codes.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'postal_codes_complete.json');
const POSTI_URL = 'https://www.posti.fi/postinumerohaku';

function loadPostalCodes() {
  const content = fs.readFileSync(POSTAL_CODES_FILE, 'utf-8');
  return content.split('\n').filter(line => line.trim());
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePostalCode(page, postalCode) {
  try {
    const comboboxSelector = '[role="combobox"]';
    await page.waitForSelector(comboboxSelector, { timeout: 5000 });
    
    // Clear
    await page.evaluate((sel) => {
      const cb = document.querySelector(sel);
      if (cb) cb.value = '';
    }, comboboxSelector);
    
    await delay(300);
    
    // Type postal code
    await page.type(comboboxSelector, postalCode, { delay: 40 });
    await page.waitForSelector('[role="listbox"]', { timeout: 10000 });
    await delay(400);
    
    // Click first option
    await page.evaluate(() => {
      const firstOpt = document.querySelector('[role="option"]');
      if (firstOpt) firstOpt.click();
    });
    
    // Wait for results table
    await page.waitForSelector('table', { timeout: 3000 }).catch(() => null);
    await delay(600);
    
    // Extract municipalities and addresses
    const data = await page.evaluate(() => {
      const municipalities = new Set();
      const addresses = [];
      
      const options = document.querySelectorAll('[role="option"]');
      options.forEach(opt => {
        const text = opt.textContent.trim();
        if (text && !text.startsWith('Tulokset haulle')) {
          const parts = text.split(/\s+/);
          if (parts.length > 1) {
            const municipality = parts.slice(1).join(' ');
            if (municipality) municipalities.add(municipality);
          }
        }
      });
      
      const rows = document.querySelectorAll('table tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 1) {
          const address = cells[0].textContent.trim();
          if (address) addresses.push(address);
        }
      });
      
      return {
        municipalities: Array.from(municipalities),
        addresses: addresses
      };
    });
    
    // Classify as post box or settlement
    const hasPostboxes = data.addresses.some(a => a.startsWith('PB ') || a.startsWith('PL '));
    const locationType = hasPostboxes ? 'POST_BOX' : (data.addresses.length > 0 ? 'SETTLEMENT' : 'NO_DATA');
    
    return {
      postal_code: postalCode,
      municipalities: data.municipalities,
      addresses: data.addresses,
      address_count: data.addresses.length,
      location_type: locationType,
      has_postboxes: hasPostboxes,
      scraped_at: new Date().toISOString(),
      success: data.addresses.length > 0
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
  
  console.log(`📍 Scraping ${total} Finnish postal codes (with proper formatting)`);
  console.log(`🔍 Classifying as POST_BOX or SETTLEMENT`);
  console.log(`💾 Saving to ${OUTPUT_FILE}\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  
  try {
    console.log('🌐 Loading Posti postinumerohaku...');
    await page.goto(POSTI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Page ready\n');
  } catch (e) {
    console.error('❌ Failed to load:', e.message);
    await browser.close();
    process.exit(1);
  }
  
  const results = [];
  let postboxes = 0;
  let settlements = 0;
  let nodata = 0;
  let errors = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < total; i++) {
    const postalCode = postalCodes[i];
    const pct = Math.floor(((i + 1) / total) * 100);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    process.stdout.write(`[${pct}%|${elapsed}s] ${postalCode}... `);
    
    try {
      const data = await scrapePostalCode(page, postalCode);
      results.push(data);
      
      if (data.success) {
        if (data.has_postboxes) {
          postboxes++;
          console.log(`📬 POST BOX (${data.address_count} addresses)`);
        } else {
          settlements++;
          console.log(`🏘️ SETTLEMENT (${data.address_count} addresses)`);
        }
      } else {
        nodata++;
        console.log(`⚠️  No data`);
      }
      
      await delay(1200);
    } catch (error) {
      errors++;
      const msg = error.message.substring(0, 40);
      console.log(`❌ ${msg}`);
      results.push({
        postal_code: postalCode,
        error: error.message,
        success: false
      });
      await delay(1200);
    }
  }
  
  await browser.close();
  
  // Save comprehensive results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
  
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const successRate = ((postboxes + settlements) / total * 100).toFixed(1);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Scraping complete! (${duration}s)`);
  console.log(`   Post boxes:   ${postboxes}`);
  console.log(`   Settlements:  ${settlements}`);
  console.log(`   No data:      ${nodata}`);
  console.log(`   Errors:       ${errors}`);
  console.log(`   Success rate: ${successRate}%`);
  console.log(`   Saved to:     ${OUTPUT_FILE}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
