import pandas as pd

# Read the CSV
df = pd.read_csv('data/postal_codes_analysis.csv')

# Convert postal_code to 5-digit zero-padded string
df['postal_code'] = df['postal_code'].astype(str).str.zfill(5)

# Save back
df.to_csv('data/postal_codes_analysis.csv', index=False)

print("Fixed postal codes:")
print(df[['postal_code', 'municipality', 'location_type']].head(10))
