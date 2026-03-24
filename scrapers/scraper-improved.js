#!/usr/bin/env node

/**
 * Improved Posti Scraper - Handles JavaScript dynamic loading
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
    const inputSelector = 'input[placeholder*="Hae"]';
    
    // Wait for input field to be available
    await page.waitForSelector(inputSelector, { timeout: 5000 });
    
    // Clear previous value with JavaScript
    await page.evaluate((sel) => {
      const input = document.querySelector(sel);
      if (input) input.value = '';
    }, inputSelector);
    
    // Type postal code
    await page.type(inputSelector, postalCode, { delay: 50 });
    
    // Wait for dropdown to appear
    let listboxFound = false;
    try {
      await page.waitForSelector('[role="listbox"]', { timeout: 3000 });
      listboxFound = true;
    } catch (e) {
      // Dropdown didn't appear, return empty result
      return {
        postal_code: postalCode,
        municipalities: [],
        total_addresses: null,
        scraped_at: new Date().toISOString(),
        success: false
      };
    }
    
    await delay(500);
    
    // Extract municipalities from dropdown options
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
    
    // If we have municipalities, click first one to load results
    if (municipalities.length > 0) {
      try {
        // Click first option
        await page.evaluate(() => {
          const firstOpt = document.querySelector('[role="option"]');
          if (firstOpt) firstOpt.click();
        });
        
        // Wait for results table to appear
        await page.waitForSelector('table', { timeout: 3000 }).catch(() => null);
        await delay(800);
        
        // Extract total count from heading
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
  
  console.log(`📍 Scraping ${total} postal codes from Posti postinumerohaku`);
  console.log(`💾 Saving to ${DATA_DIR}/`);
  console.log(`⏱️  With dynamic content waiting...\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  
  try {
    console.log('🌐 Loading Posti website...');
    await page.goto(POSTI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Page loaded\n');
  } catch (e) {
    console.error('❌ Failed to load:', e.message);
    await browser.close();
    process.exit(1);
  }
  
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < postalCodes.length; i++) {
    const postalCode = postalCodes[i];
    const pct = ((i + 1) / total * 100).toFixed(0);
    
    process.stdout.write(`[${pct.padStart(3)}%] ${postalCode}... `);
    
    try {
      const data = await scrapePostalCode(page, postalCode);
      
      // Save result
      const outputFile = path.join(DATA_DIR, `${postalCode}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
      
      if (data.success) {
        successful++;
        const cities = data.municipalities.join('/');
        const addrs = data.total_addresses || '?';
        console.log(`✅ ${cities} (${addrs} addresses)`);
      } else {
        failed++;
        console.log(`⚠️  No data`);
      }
      
      // Rate limiting
      await delay(1200);
    } catch (error) {
      failed++;
      console.log(`❌ ${error.message.substring(0, 40)}`);
      await delay(1200);
    }
  }
  
  await browser.close();
  
  const successRate = ((successful / total) * 100).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Results:`);
  console.log(`   ✅ Successful: ${successful}/${total} (${successRate}%)`);
  console.log(`   ❌ No data: ${failed}/${total}`);
  console.log(`   📁 Saved to: ${DATA_DIR}/`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
