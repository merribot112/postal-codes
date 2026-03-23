#!/usr/bin/env node

/**
 * FINAL Posti Scraper - Correctly targets combobox component
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
    // Find and click the combobox (not a regular input!)
    const comboboxSelector = '[role="combobox"]';
    await page.waitForSelector(comboboxSelector, { timeout: 5000 });
    
    // Clear previous value
    await page.evaluate((sel) => {
      const cb = document.querySelector(sel);
      if (cb) cb.value = '';
    }, comboboxSelector);
    
    await delay(200);
    
    // Type into combobox
    await page.type(comboboxSelector, postalCode, { delay: 30 });
    
    // Wait for dropdown to appear
    await page.waitForSelector('[role="listbox"]', { timeout: 3000 });
    await delay(400);
    
    // Extract municipalities from dropdown
    const municipalities = await page.evaluate(() => {
      const options = document.querySelectorAll('[role="option"]');
      const munis = [];
      
      options.forEach(opt => {
        const text = opt.textContent.trim();
        // Skip "Tulokset haulle" option
        if (text && !text.startsWith('Tulokset haulle')) {
          // Parse "XXXXX MUNICIPALITYNAME" format
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
        // Click first option
        await page.evaluate(() => {
          const firstOpt = document.querySelector('[role="option"]');
          if (firstOpt) firstOpt.click();
        });
        
        // Wait for results table
        await page.waitForSelector('table', { timeout: 2000 }).catch(() => null);
        await delay(600);
        
        // Extract total count from heading "Hakutulokset (Yhteensä X tulosta)"
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
        // If result loading fails, continue with municipalities we got
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
  
  console.log(`📍 Scraping ${total} Finnish postal codes`);
  console.log(`🎯 Using combobox selector [role="combobox"]`);
  console.log(`💾 Saving to ${DATA_DIR}/\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  
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
  
  for (let i = 0; i < postalCodes.length; i++) {
    const postalCode = postalCodes[i];
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
        console.log(`⚠️  No data`);
      }
      
      // Rate limiting
      await delay(1200);
    } catch (error) {
      failed++;
      const msg = error.message.substring(0, 35);
      console.log(`❌ ${msg}`);
      await delay(1200);
    }
  }
  
  await browser.close();
  
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const successRate = ((successful / total) * 100).toFixed(1);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Complete! (${duration}s)`);
  console.log(`   Successful:  ${successful}/${total} (${successRate}%)`);
  console.log(`   Failed:      ${failed}/${total}`);
  console.log(`   Location:    ${DATA_DIR}/`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
