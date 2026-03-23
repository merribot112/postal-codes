#!/usr/bin/env python3
"""
Posti Postinumerohaku Scraper
Scrapes postal code data from https://www.posti.fi/postinumerohaku
Saves results as JSON files in data/ folder, named by postal code.
"""

import json
import time
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

# Configuration
POSTAL_CODES_FILE = Path(__file__).parent / "postal_codes.txt"
DATA_DIR = Path(__file__).parent / "data"
POSTI_URL = "https://www.posti.fi/postinumerohaku"

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)

def load_postal_codes():
    """Load postal codes from file."""
    with open(POSTAL_CODES_FILE) as f:
        return [line.strip() for line in f if line.strip()]

def scrape_postal_code(page, postal_code):
    """
    Scrape data for a single postal code.
    Returns dict with postal code, municipalities, and metadata.
    """
    try:
        # Click on search field
        page.fill('[placeholder="Hae osoitteella tai postinumerolla"]', postal_code)
        
        # Wait for dropdown to appear
        page.wait_for_selector('[role="listbox"]', timeout=5000)
        
        # Get all options
        options = page.locator('[role="option"]').all()
        
        results = {
            "postal_code": postal_code,
            "municipalities": [],
            "total_addresses": None,
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Process each municipality option (skip the "Results for..." one)
        for option in options:
            text = option.text_content().strip()
            if text.startswith("Tulokset haulle"):  # Skip result count option
                continue
            if text:
                results["municipalities"].append(text)
        
        # If we have municipalities, click the first one to see total count
        if results["municipalities"]:
            # Click first municipality
            first_option = page.locator('[role="option"]').first
            first_option.click()
            
            # Wait for results table to appear
            page.wait_for_selector('h1:has-text("Hakutulokset")', timeout=5000)
            
            # Extract result count from heading
            heading = page.locator('h1').get_by_text("Hakutulokset").first
            heading_text = heading.text_content()
            
            # Parse "Hakutulokset (Yhteensä XXXX tulosta)" -> extract number
            if "Yhteensä" in heading_text:
                count_str = heading_text.split("Yhteensä")[1].split("tulosta")[0].strip()
                results["total_addresses"] = int(count_str)
        
        return results
    
    except Exception as e:
        return {
            "postal_code": postal_code,
            "error": str(e),
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

def main():
    """Main scraper loop."""
    postal_codes = load_postal_codes()
    total = len(postal_codes)
    
    print(f"📍 Loading {total} postal codes from {POSTAL_CODES_FILE}")
    print(f"💾 Saving results to {DATA_DIR}/")
    print()
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(POSTI_URL)
        
        for i, postal_code in enumerate(postal_codes, 1):
            print(f"[{i:3d}/{total}] Scraping {postal_code}...", end=" ", flush=True)
            
            try:
                # Clear previous search
                page.fill('[placeholder="Hae osoitteella tai postinumerolla"]', "")
                time.sleep(0.5)
                
                # Scrape
                data = scrape_postal_code(page, postal_code)
                
                # Save to JSON file
                output_file = DATA_DIR / f"{postal_code}.json"
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                if "error" in data:
                    print(f"❌ {data['error']}")
                else:
                    print(f"✅ {len(data['municipalities'])} cities, {data.get('total_addresses', 'N/A')} addresses")
                
                # Rate limiting
                time.sleep(1)
            
            except KeyboardInterrupt:
                print("\n⏹️  Interrupted by user")
                break
            except Exception as e:
                print(f"❌ Exception: {e}")
        
        browser.close()
    
    print()
    print(f"✅ Scraping complete! Results saved to {DATA_DIR}/")

if __name__ == "__main__":
    main()
