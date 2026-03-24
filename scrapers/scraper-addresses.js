#!/usr/bin/env node

/**
 * Address Detail Scraper - Extract actual address names to detect post boxes
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADDRESSES_DIR = path.join(__dirname, '..', 'data_addresses');
const POSTI_URL = 'https://www.posti.fi/postinumerohaku';

if (!fs.existsSync(ADDRESSES_DIR)) {
  fs.mkdirSync(ADDRESSES_DIR, { recursive: true });
}

function loadPostalCodes() {
  const codes = [];
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    if (data.success && data.municipalities) {
      codes.push(data.postal_code);
    }
  }
  
  return codes.sort();
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeAddresses(page, postalCode) {
  try {
    const comboboxSelector = '[role="combobox"]';
    await page.waitForSelector(comboboxSelector, { timeout: 5000 });
    
    // Clear
    await page.evaluate((sel) => {
      const cb = document.querySelector(sel);
      if (cb) cb.value = '';
    }, comboboxSelector);
    
    await delay(200);
    
    // Type postal code
    await page.type(comboboxSelector, postalCode, { delay: 30 });
    await page.waitForSelector('[role="listbox"]', { timeout: 10000 });
    await delay(400);
    
    // Click first option to load results
    await page.evaluate(() => {
      const firstOpt = document.querySelector('[role="option"]');
      if (firstOpt) firstOpt.click();
    });
    
    // Wait for table and extract addresses
    await page.waitForSelector('table', { timeout: 3000 }).catch(() => null);
    await delay(600);
    
    // Extract all street/address names from table cells
    const addresses = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const addrs = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 1) {
          const address = cells[0].textContent.trim();
          if (address) addrs.push(address);
        }
      });
      
      return addrs;
    });
    
    return {
      postal_code: postalCode,
      addresses: addresses,
      count: addresses.length,
      has_postboxes: addresses.some(a => a.startsWith('PB ') || a.startsWith('PL ')),
      scraped_at: new Date().toISOString(),
      success: addresses.length > 0
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
  
  console.log(`📍 Extracting addresses for ${total} postal codes`);
  console.log(`🔍 Looking for PB/PL (post box) prefixes`);
  console.log(`💾 Saving to ${ADDRESSES_DIR}/\n`);
  
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
  
  let postboxes = 0;
  let settlements = 0;
  let failed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < total; i++) {
    const postalCode = postalCodes[i];
    const pct = Math.floor(((i + 1) / total) * 100);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    process.stdout.write(`[${pct}%|${elapsed}s] ${postalCode}... `);
    
    try {
      const data = await scrapeAddresses(page, postalCode);
      
      // Save detailed address data
      const outputFile = path.join(ADDRESSES_DIR, `${postalCode}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
      
      if (data.success) {
        if (data.has_postboxes) {
          postboxes++;
          console.log(`📬 POST BOX (${data.count} addresses)`);
        } else {
          settlements++;
          console.log(`🏘️ SETTLEMENT (${data.count} addresses)`);
        }
      } else {
        failed++;
        console.log(`⚠️  No addresses found`);
      }
      
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
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Analysis complete! (${duration}s)`);
  console.log(`   Post boxes:   ${postboxes}`);
  console.log(`   Settlements:  ${settlements}`);
  console.log(`   Failed:       ${failed}`);
  console.log(`   Total:        ${total}`);
  console.log(`   Location:     ${ADDRESSES_DIR}/`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
