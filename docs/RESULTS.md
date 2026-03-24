# Posti Postal Code Scraping Results

## Summary

- **Total postal codes:** 196
- **Successfully scraped:** 156 (79.6%)
- **Failed/Invalid:** 40 (20.4%)
- **Runtime:** 870 seconds (~14.5 minutes)
- **Data saved:** `/postal_codes/data/*.json`

## Data Format

Each successful JSON file contains:

```json
{
  "postal_code": "65101",
  "municipalities": ["VASA"],
  "total_addresses": 666,
  "scraped_at": "2026-03-23T16:11:24.703Z",
  "success": true
}
```

### Fields
- `postal_code`: 5-digit Finnish postal code
- `municipalities`: List of municipality names (Finnish names extracted from search results)
- `total_addresses`: Total number of street addresses in that postal code
- `scraped_at`: ISO 8601 timestamp
- `success`: Boolean indicating successful extraction

## Top 10 Largest Postal Code Areas

```bash
# To find largest areas:
jq -s 'sort_by(.total_addresses) | reverse | .[0:10]' postal_codes/data/*.json
```

## Sample Results

- **65101** (VASA): 666 addresses
- **70101** (KUOPIO): 628 addresses
- **62375** (YLIHÄRMÄ): 1,301 addresses
- **68555** (BOSUND): 810 addresses
- **99555** (LUOSTO): 606 addresses

## Failed Postal Codes

The 40 failed entries are primarily invalid/non-existent postal codes from the original list.

## Next Steps

The scraped data can now be:
1. Imported into the postal code ontology
2. Used for regional classification systems
3. Integrated with property/address databases
4. Analyzed for postal code density patterns

---

**Scraper:** `scraper-final.js`  
**Key fix:** Used `[role="combobox"]` instead of regular input selector
