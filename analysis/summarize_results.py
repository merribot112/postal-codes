#!/usr/bin/env python3
"""
Summarize scraped postal code data.
Shows statistics and sample results.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def main():
    """Summarize results."""
    json_files = sorted(DATA_DIR.glob("*.json"))
    
    if not json_files:
        print("❌ No JSON files found in data/ directory")
        return
    
    print(f"📊 Summary of Scraped Postal Codes")
    print(f"{'=' * 50}")
    print(f"Total files: {len(json_files)}")
    print()
    
    successful = 0
    failed = 0
    total_addresses = 0
    municipality_counts = {}
    
    for json_file in json_files:
        with open(json_file) as f:
            data = json.load(f)
        
        if "error" in data:
            failed += 1
        else:
            successful += 1
            if data.get("total_addresses"):
                total_addresses += data["total_addresses"]
            for mun in data.get("municipalities", []):
                municipality_counts[mun] = municipality_counts.get(mun, 0) + 1
    
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📍 Total addresses found: {total_addresses:,}")
    print()
    
    print(f"🏘️  Top 10 Municipalities:")
    for mun, count in sorted(municipality_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"   {mun:20} - {count:3} postal codes")
    print()
    
    print(f"📄 Sample Results (first 5):")
    for json_file in json_files[:5]:
        with open(json_file) as f:
            data = json.load(f)
        
        postal_code = data["postal_code"]
        if "error" in data:
            print(f"   {postal_code}: ❌ {data['error']}")
        else:
            cities = ", ".join(data.get("municipalities", []))
            addresses = data.get("total_addresses", "N/A")
            print(f"   {postal_code}: {cities} ({addresses} addresses)")

if __name__ == "__main__":
    main()
