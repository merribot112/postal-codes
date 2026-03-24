#!/usr/bin/env python3

import pandas as pd
import json
import os
from pathlib import Path

# Read existing analysis
df = pd.read_csv('data/postal_codes_analysis.csv')

# Check each postal code's addresses for PB/PL prefixes
addresses_dir = Path('data_addresses')
postbox_codes = set()
settlement_codes = set()

print("Analyzing addresses for PB/PL prefixes...")
print("=" * 70)

for json_file in sorted(addresses_dir.glob('*.json')):
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        if data.get('success') and data.get('addresses'):
            code = data['postal_code']
            addresses = data['addresses']
            
            # Check if any address is a post box (PB or PL prefix)
            has_postboxes = any(addr.startswith('PB ') or addr.startswith('PL ') 
                               for addr in addresses)
            
            if has_postboxes:
                postbox_codes.add(code)
            else:
                settlement_codes.add(code)
    except Exception as e:
        print(f"Error processing {json_file}: {e}")

# Update DataFrame classification
print(f"\nPost boxes detected: {len(postbox_codes)}")
print(f"Settlements detected: {len(settlement_codes)}")
print("\nUpdating classification...")

for code in postbox_codes:
    # Convert code to match CSV format (no leading zeros in some cases)
    code_int = int(code)
    mask = df['postal_code'] == code_int
    if mask.any():
        df.loc[mask, 'location_type'] = 'POST_BOX'
        df.loc[mask, 'is_actual_location'] = False
        df.loc[mask, 'location_confidence'] = 0.0

# Save updated CSV
df.to_csv('data/postal_codes_analysis.csv', index=False)

# Generate summary report
print("\n" + "=" * 70)
print("CORRECTED POSTAL CODE CLASSIFICATION")
print("=" * 70)

summary = df['location_type'].value_counts()
print("\nLocation Classification Summary:")
print("-" * 40)
for loc_type, count in summary.items():
    pct = (count / len(df)) * 100
    print(f"  {loc_type:<25} {count:>3} ({pct:>5.1f}%)")

print(f"\nTotal postal codes: {len(df)}")
print(f"  - Post boxes:       {len(df[df['location_type'] == 'POST_BOX'])} ({(len(df[df['location_type'] == 'POST_BOX'])/len(df)*100):.1f}%)")
print(f"  - Actual locations: {len(df[df['is_actual_location'] == True])} ({(len(df[df['is_actual_location'] == True])/len(df)*100):.1f}%)")
print(f"  - Non-existent:     {len(df[df['location_type'] == 'NONEXISTENT'])} ({(len(df[df['location_type'] == 'NONEXISTENT'])/len(df)*100):.1f}%)")

print("\n" + "=" * 70)
print("Reclassification complete!")
print("Updated: data/postal_codes_analysis.csv")
