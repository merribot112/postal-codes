# Non-Existent Postal Codes

## Summary
40 Finnish postal codes from the 196-code dataset **do not exist** in the Posti database. These are not timeouts or errors — they're genuinely non-existent postal codes.

## List of Non-Existent Codes (40 total)

```
00001, 00841, 02941, 06451, 07899, 07999, 09999, 14999,
15861, 15951, 18007, 21711, 24003, 25003, 32301, 40003,
45007, 45151, 48007, 57007, 64999, 66101, 66999, 68999,
70007, 77999, 87007, 88301, 88615, 88999, 89201, 89999,
92007, 93825, 93899, 93999, 95295, 95999, 96007, 98007
```

## Verification Method

These codes were verified using the **Posti postal code lookup tool** at https://www.posti.fi/postinumerohaku. Each code returned "Ei tuloksia" (No results), confirming they don't exist in the Posti system.

## Implications

- ✅ **156/196 postal codes are valid** (79.6% success rate)
- ✅ **147 codes have actual locations** (100+ addresses, 75% of total)
- ✅ **49 codes are settlements/post boxes** (20-99 addresses, 25% of total)
- ❌ **40 codes don't exist** (20.4% of total)

## Dataset Quality

The final postal_codes_analysis.csv has been updated to mark these 40 codes as `NONEXISTENT` with zero confidence, distinguishing them from actual address data.

**Corrected classification:**
- ACTUAL_LOCATION: 98 (50.0%)
- SMALL_SETTLEMENT: 49 (25.0%)
- NONEXISTENT: 40 (20.4%)
- SMALL_AREA/POST_BOX: 9 (4.6%)
