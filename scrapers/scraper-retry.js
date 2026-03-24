#!/usr/bin/env node

/**
 * Retry Scraper - Rerun failed postal codes with longer timeout
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const DATA_DIR = path.join(__dirname, '..', 'data_retry');
const POSTI_URL = 'https://www.posti.fi/postinumerohaku';

// Failed postal codes from first run
const FAILED_POSTAL_CODES = [
  '00001', '00841', '02941', '06451', '07899', '07999', '09999', '14999',
  '15861', '15951', '18007', '21711', '24003', '25003', '32301', '40003',
  '45007', '45151', '48007', '57007', '64999', '66101', '66999', '68999',
  '70007', '77999', '87007', '88301', '88615', '88999', '89201', '89999',
  '92007', '93825', '93899', '93999', '95295', '95999', '96007', '98007'
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePostalCode(page, postalCode) {
  try {
    // Find and click the combobox
    const comboboxSelector = '[role="combobox"]';
    await page.waitForSelector(comboboxSelector, { timeout: 5000 });
    
    // Clear previous value
    await page.evaluate((sel) => {
      const cb = document.querySelector(sel);
      if (cb) cb.value = '';
    }, comboboxSelector);
    
    await delay(300);
    
    // Type into combobox
    await page.type(comboboxSelector, postalCode, { delay: 40 });
    
    // LONGER TIMEOUT for dropdown (10 seconds instead of 3)
    await page.waitForSelector('[role="listbox"]', { timeout: 10000 });
    await delay(500);
    
    // Extract municipalities from dropdown
    const municipalities = await page.evaluate(() => {
      const options = document.querySelectorAll('[role="option"]');
      const munis = [];
      
      options.forEach(opt => {
        const text = opt.textContent.trim();
        if (text && !text.startsWith('Tulokset haulle')) {
          const parts = text.split(/\s+/);
          if (parts.length > 1) {
            const municipality = parts.slice(1).join(' ');
            if (municipality && !munis.includes(municipality)) {
              munis.push(municipality);
            }
          }
        }
      });
      
      return munis;
    });
    
    let totalAddresses = null;
    
    // If we got municipalities, click first one to load results
    if (municipalities.length > 0) {
      try {
        await page.evaluate(() => {
          const firstOpt = document.querySelector('[role="option"]');
          if (firstOpt) firstOpt.click();
        });
        
        // Wait for results table
        await page.waitForSelector('table', { timeout: 3000 }).catch(() => null);
        await delay(800);
        
        // Extract total count
        totalAddresses = await page.evaluate(() => {
          const headings = document.querySelectorAll('h2');
          for (let heading of headings) {
            const match = heading.textContent.match(/Yhteensä\s+(\d+)/);
            if (match) {
              return parseInt(match[1]);
            }
          }
          return null;
        });
      } catch (e) {
        // Continue with municipalities if result loading fails
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
  const total = FAILED_POSTAL_CODES.length;
  
  console.log(`🔄 Retrying ${total} failed postal codes with longer timeout`);
  console.log(`⏱️  Listbox timeout: 10 seconds (was 3s)`);
  console.log(`💾 Saving to ${DATA_DIR}/\n`);
  
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
  
  let successful = 0;
  let failed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < total; i++) {
    const postalCode = FAILED_POSTAL_CODES[i];
    const pct = Math.floor(((i + 1) / total) * 100);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    process.stdout.write(`[${pct}%|${elapsed}s] ${postalCode}... `);
    
    try {
      const data = await scrapePostalCode(page, postalCode);
      
      // Save result
      const outputFile = path.join(DATA_DIR, `${postalCode}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
      
      if (data.success) {
        successful++;
        const cities = data.municipalities.join('/');
        const addrs = data.total_addresses !== null ? data.total_addresses : '?';
        console.log(`✅ ${cities} (${addrs})`);
      } else {
        failed++;
        console.log(`⚠️  No data returned`);
      }
      
      // Rate limiting
      await delay(1500);
    } catch (error) {
      failed++;
      const msg = error.message.substring(0, 40);
      console.log(`❌ ${msg}`);
      await delay(1500);
    }
  }
  
  await browser.close();
  
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const successRate = ((successful / total) * 100).toFixed(1);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Retry complete! (${duration}s)`);
  console.log(`   Successful:  ${successful}/${total} (${successRate}%)`);
  console.log(`   Failed:      ${failed}/${total}`);
  console.log(`   Location:    ${DATA_DIR}/`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
