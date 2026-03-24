#!/usr/bin/env python3
"""
Analyze Finnish postal codes from scraped data.
Determine: valid codes, location type (actual place vs post box), map verification.
"""

import json
import pandas as pd
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).parent / 'data'

def load_scraped_data():
    """Load all JSON files from data directory."""
    data = []
    for json_file in sorted(DATA_DIR.glob('*.json')):
        with open(json_file) as f:
            data.append(json.load(f))
    return data

def analyze_postal_codes():
    """
    Analyze each postal code and create validation report.
    """
    scraped_data = load_scraped_data()
    
    results = []
    
    for entry in scraped_data:
        postal_code = entry['postal_code']
        
        # Basic validation
        is_valid = (
            entry.get('success', False) and 
            len(entry.get('municipalities', [])) > 0
        )
        
        municipalities = entry.get('municipalities', [])
        total_addresses = entry.get('total_addresses')
        error = entry.get('error')
        
        # Type classification
        if not is_valid:
            location_type = 'INVALID'
            location_confidence = 0.0
        elif total_addresses is None:
            location_type = 'UNKNOWN'
            location_confidence = 0.5
        elif total_addresses == 0:
            location_type = 'POST_BOX_ONLY'
            location_confidence = 0.3
        elif total_addresses < 20:
            location_type = 'SMALL_AREA/POST_BOX'
            location_confidence = 0.6
        elif total_addresses < 100:
            location_type = 'SMALL_SETTLEMENT'
            location_confidence = 0.8
        else:
            location_type = 'ACTUAL_LOCATION'
            location_confidence = 0.95
        
        # Validity assessment
        validity_status = 'VALID' if is_valid else 'INVALID'
        if is_valid and total_addresses and total_addresses > 0:
            validity_status = 'VALID_WITH_ADDRESSES'
        elif is_valid and total_addresses == 0:
            validity_status = 'VALID_NO_ADDRESSES'
        
        results.append({
            'postal_code': postal_code,
            'municipality': ', '.join(municipalities) if municipalities else None,
            'num_municipalities': len(municipalities),
            'total_addresses': total_addresses,
            'location_type': location_type,
            'location_confidence': location_confidence,
            'validity_status': validity_status,
            'is_actual_location': location_type in ['ACTUAL_LOCATION', 'SMALL_SETTLEMENT'],
            'error': error,
            'scraped_successfully': entry.get('success', False)
        })
    
    return pd.DataFrame(results)

def main():
    print('📊 Analyzing postal codes...')
    df = analyze_postal_codes()
    
    # Save to CSV
    output_file = Path(__file__).parent / 'postal_codes_analysis.csv'
    df.to_csv(output_file, index=False)
    print(f'✅ Analysis complete! Saved to {output_file}')
    print()
    
    # Statistics
    print('📈 Statistics:')
    print(f'   Total codes analyzed: {len(df)}')
    print(f'   Valid codes: {(df["validity_status"] != "INVALID").sum()}')
    print(f'   Invalid codes: {(df["validity_status"] == "INVALID").sum()}')
    print()
    
    print('📍 Location Type Breakdown:')
    for loc_type in df['location_type'].unique():
        count = (df['location_type'] == loc_type).sum()
        pct = (count / len(df)) * 100
        print(f'   {loc_type:20} - {count:3} ({pct:5.1f}%)')
    print()
    
    print('📊 Validity Status Breakdown:')
    for status in df['validity_status'].unique():
        count = (df['validity_status'] == status).sum()
        pct = (count / len(df)) * 100
        print(f'   {status:20} - {count:3} ({pct:5.1f}%)')
    print()
    
    print('🗺️  Actual Locations vs Post Boxes:')
    actual_locations = df['is_actual_location'].sum()
    post_boxes = len(df) - actual_locations
    print(f'   Actual locations: {actual_locations} ({(actual_locations/len(df))*100:.1f}%)')
    print(f'   Post boxes/unknown: {post_boxes} ({(post_boxes/len(df))*100:.1f}%)')
    print()
    
    # Sample data
    print('📋 Sample Results (first 10):')
    print(df[['postal_code', 'municipality', 'total_addresses', 'location_type', 'validity_status']].head(10).to_string())
    print()
    
    print('✅ DataFrame ready for use!')
    print(f'   Shape: {df.shape}')
    print(f'   Columns: {list(df.columns)}')
    
    return df

if __name__ == '__main__':
    df = main()
