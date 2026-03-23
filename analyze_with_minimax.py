#!/usr/bin/env python3
"""
Advanced postal code analysis using Minimax AI model.
Provides deep insights, patterns, and regional analysis.
"""

import json
import pandas as pd
from pathlib import Path
import anthropic

DATA_DIR = Path(__file__).parent / 'data'
CSV_FILE = Path(__file__).parent / 'postal_codes_analysis.csv'

def load_analysis_data():
    """Load the existing analysis CSV."""
    df = pd.read_csv(CSV_FILE)
    return df

def prepare_analysis_context(df):
    """Prepare summary context for Minimax analysis."""
    
    # Statistics
    valid_count = (df['validity_status'] != 'INVALID').sum()
    actual_locations = df['is_actual_location'].sum()
    
    # Regional breakdown by postal code prefix
    df['prefix'] = df['postal_code'].astype(str).str[:2]
    prefix_stats = df.groupby('prefix').agg({
        'postal_code': 'count',
        'total_addresses': 'sum',
        'is_actual_location': 'sum'
    }).rename(columns={'postal_code': 'count', 'total_addresses': 'total_addresses', 'is_actual_location': 'actual_locations'})
    
    # Location type distribution
    location_dist = df['location_type'].value_counts().to_dict()
    
    # Top municipalities
    muni_stats = df[df['municipality'].notna()].groupby('municipality').agg({
        'postal_code': 'count',
        'total_addresses': 'sum'
    }).sort_values('total_addresses', ascending=False).head(15)
    
    context = f"""
# Postal Code Analysis Data

## Overview
- Total postal codes: {len(df)}
- Valid codes: {valid_count} ({(valid_count/len(df)*100):.1f}%)
- Actual locations: {actual_locations} ({(actual_locations/len(df)*100):.1f}%)

## Location Type Distribution
{json.dumps(location_dist, indent=2)}

## Regional Analysis (by postal code prefix)
{prefix_stats.to_string()}

## Top 15 Municipalities by Address Count
{muni_stats.to_string()}

## Sample of Valid Actual Locations
{df[df['is_actual_location'] == True][['postal_code', 'municipality', 'total_addresses', 'location_type']].head(20).to_string()}

## Sample of Invalid Codes
{df[df['validity_status'] == 'INVALID'][['postal_code', 'error']].head(15).to_string()}
"""
    
    return context, df

def analyze_with_minimax(context, df):
    """Send analysis to Minimax for deep insights."""
    
    client = anthropic.Anthropic()
    
    prompt = f"""You are a Finnish postal code expert analyzing a dataset of {len(df)} postal codes.

Here is the postal code analysis data:

{context}

Please provide a comprehensive analysis covering:

1. **Validity Assessment**: Analyze the 40 invalid codes. What patterns do you see? Are they typos, deprecated codes, or special postal codes?

2. **Geographic Distribution**: Analyze the postal code prefixes. What regions do they represent? Are there any unusual distributions?

3. **Actual Locations vs Post Boxes**: Discuss the significance of the 75% actual locations vs 25% post boxes/unknown. What does this tell us about Finland's postal infrastructure?

4. **Regional Insights**: Which municipalities have the most addresses? What can we infer about urban vs rural distribution?

5. **Data Quality**: Assess the quality of the scraped data. Are there any anomalies or interesting patterns?

6. **Recommendations**: Suggest how this data could be used for postal code validation, geographic analysis, or address lookup systems.

Provide your analysis in a structured format with clear sections and bullet points."""

    print("🤖 Sending analysis to Minimax...")
    print("(This may take a moment)\n")
    
    message = client.messages.create(
        model="minimax-portal/MiniMax-M2.5",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    return message.content[0].text

def save_analysis_report(analysis_text, df):
    """Save the Minimax analysis to a file."""
    
    report_file = Path(__file__).parent / 'postal_codes_minimax_analysis.md'
    
    with open(report_file, 'w') as f:
        f.write("# Finnish Postal Code Analysis - Minimax AI Report\n\n")
        f.write(f"*Generated: {pd.Timestamp.now()}*\n\n")
        f.write(analysis_text)
        f.write(f"\n\n---\n\n")
        f.write("## Data Summary\n\n")
        f.write(f"- Total codes analyzed: {len(df)}\n")
        f.write(f"- Valid codes: {(df['validity_status'] != 'INVALID').sum()}\n")
        f.write(f"- Actual locations: {df['is_actual_location'].sum()}\n")
    
    return report_file

def main():
    print("📊 Loading postal code analysis data...")
    df = load_analysis_data()
    
    print("📝 Preparing analysis context...")
    context, df = prepare_analysis_context(df)
    
    print("🔍 Analyzing with Minimax AI...\n")
    analysis = analyze_with_minimax(context, df)
    
    print("=" * 70)
    print("MINIMAX AI ANALYSIS RESULTS")
    print("=" * 70)
    print(analysis)
    print("=" * 70)
    print()
    
    print("💾 Saving report...")
    report_file = save_analysis_report(analysis, df)
    print(f"✅ Report saved to: {report_file}")
    
    return df, analysis

if __name__ == '__main__':
    df, analysis = main()
