import pandas as pd

# Read existing analysis
df = pd.read_csv('data/postal_codes_analysis.csv')

# Failed postal codes (stored as integers in CSV, so without leading zeros)
nonexistent_codes = [
    1, 841, 2941, 6451, 7899, 7999, 9999, 14999,
    15861, 15951, 18007, 21711, 24003, 25003, 32301, 40003,
    45007, 45151, 48007, 57007, 64999, 66101, 66999, 68999,
    70007, 77999, 87007, 88301, 88615, 88999, 89201, 89999,
    92007, 93825, 93899, 93999, 95295, 95999, 96007, 98007
]

# Update the DataFrame for nonexistent codes
for code in nonexistent_codes:
    mask = df['postal_code'] == code
    if mask.any():
        df.loc[mask, 'location_type'] = 'NONEXISTENT'
        df.loc[mask, 'validity_status'] = 'NONEXISTENT'
        df.loc[mask, 'location_confidence'] = 0.0
        df.loc[mask, 'is_actual_location'] = False
        df.loc[mask, 'error'] = 'Postal code does not exist in Posti database'

# Save updated CSV
df.to_csv('data/postal_codes_analysis.csv', index=False)

# Generate summary report
print("=" * 70)
print("POSTAL CODE ANALYSIS - CORRECTED CLASSIFICATION")
print("=" * 70)

summary = df['location_type'].value_counts()
print("\nLocation Classification Summary:")
print("-" * 40)
for loc_type, count in summary.items():
    pct = (count / len(df)) * 100
    print(f"  {loc_type:<25} {count:>3} ({pct:>5.1f}%)")

print(f"\nTotal postal codes: {len(df)}")

actual = len(df[df['is_actual_location'] == True])
nonexist = len(df[df['location_type'] == 'NONEXISTENT'])
valid = len(df[df['validity_status'] == 'VALID_WITH_ADDRESSES'])

print(f"\nActual locations (100+ addresses): {actual} ({(actual/len(df)*100):.1f}%)")
print(f"Non-existent postal codes:         {nonexist} ({(nonexist/len(df)*100):.1f}%)")
print(f"Small settlements (20-99 addresses): {len(df[df['location_type'] == 'SMALL_SETTLEMENT'])} ({(len(df[df['location_type'] == 'SMALL_SETTLEMENT'])/len(df)*100):.1f}%)")
print(f"Small areas/post boxes (<20):       {len(df[df['location_type'] == 'SMALL_AREA/POST_BOX'])} ({(len(df[df['location_type'] == 'SMALL_AREA/POST_BOX'])/len(df)*100):.1f}%)")

print("\n" + "=" * 70)
