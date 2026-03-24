# Finnish Postal Code Analysis Plan
## Distinguishing Geographical Locations from Post Boxes

**Objective:** Classify each postal code in postal_codes.txt as either:
- **Real Location** - Service addresses for actual buildings/streets
- **Post Box** - Dedicated P.O. Box addresses
- **Special Purpose** - Government offices, institutions, companies

---

## Phase 1: Research & Data Collection

### 1.1 Finnish Postal System Understanding
- **Postnord Finland structure**: Main carrier for Finland
- **Postal code format**: 5 digits (00000-99999)
- **Key distinction**: Street addresses vs. P.O. Boxes often have different codes or patterns
- **Special codes**: Government, corporate headquarters, large institutions

### 1.2 Data Sources to Consult
1. **Postnord Finland database** (postnord.fi)
   - Search each postal code
   - Note if it's city/street or P.O. Box
   
2. **Itella (former Finnish Post)**
   - Historical postal code database
   
3. **Maanmittauslaitos (Finnish Land Registry)**
   - Geographic coordinates for postal codes
   
4. **OpenStreetMap/Google Maps**
   - Verify postal codes exist as real locations
   
5. **Finnish Statistics Bureau (Tilastokeskus)**
   - Official postal code registry

### 1.3 Pattern Analysis
Look for typical P.O. Box postal codes:
- Some postal codes are reserved exclusively for P.O. Boxes
- Example: Codes like 00100 (Helsinki Central), 33100 (Tampere) often have dedicated P.O. Box ranges
- Corporate headquarters often have dedicated codes

---

## Phase 2: Classification Methodology

### 2.1 Heuristic Rules
```
Rule 1: Geographic vs. P.O. Box Distinction
- Postal codes ending in certain digits may indicate P.O. Boxes
- Codes with very few actual streets = likely P.O. Box concentrated
- Codes with wide geographic spread = real locations

Rule 2: Population/Density Check
- High-density codes (00100, 33100, etc.) likely mixed
- Rural codes (9XXXX) more likely real locations
- Mid-range codes need individual verification

Rule 3: Known P.O. Box Ranges
- Research major Finnish cities' P.O. Box allocations
- Banks, government offices often have dedicated codes
```

### 2.2 Data Enrichment
For each postal code, collect:
- City name
- Street names (if any)
- Population served
- Primary use (residential, commercial, P.O., government)
- Coordinates (lat/lon)
- Number of delivery points

---

## Phase 3: Implementation Steps

### 3.1 Web Scraping / API Queries
```bash
For each postal code:
1. Query Postnord Finland: GET /postal-code/{code}
2. Check OpenStreetMap Nominatim API
3. Cross-reference with Finnish Land Registry
4. Validate with Google Maps
```

### 3.2 Build Classification Dataset
```csv
PostalCode,City,Type,PrimaryUse,Verified,Source,Notes
00001,Helsinki,Real,Residential,Yes,Postnord,Kamppi area
00017,Helsinki,PO_Box,Government,Yes,Postnord,P.O. Box center
...
```

### 3.3 Machine Learning Approach (Optional)
- Train classifier on known P.O. Box vs. real location examples
- Features: city, code range, naming patterns, validation sources
- Output: confidence scores

---

## Phase 4: Tools & Resources

### 4.1 Primary Source: Posti.fi
- **Official Source:** https://www.posti.fi/postinumerohaku
- **Type:** Postal code search tool (Finland's official postal service)
- **Data Available:** City, delivery type, P.O. Box indicator
- **Method:** Web scraping + manual verification
- **Reliability:** Highest - official Posti Finland database

### 4.2 Secondary APIs
| Service | Endpoint | Rate Limit |
|---------|----------|-----------|
| OSM Nominatim | nominatim.openstreetmap.org | 1 req/sec |
| Google Maps | maps.googleapis.com | Key-dependent |
| OpenAddress | openaddresses.io | Free |

### 4.2 Python Libraries
```python
import requests
import nominatim  # OSM geocoding
import pandas as pd
import json

# For web scraping if no API available
from bs4 import BeautifulSoup
import selenium
```

### 4.3 Manual Research Tools
- Postnord.fi website search
- Google Maps postal code search
- Finnish company registries
- Local municipality records

---

## Phase 5: Expected Outcomes

### 5.1 Output Format
```json
{
  "postalCode": "00001",
  "city": "Helsinki",
  "classification": "Real Location",
  "confidence": 0.95,
  "type": "Residential/Commercial/Mixed",
  "streetNames": ["Kampinkuja", ...],
  "geometry": {
    "type": "Point",
    "coordinates": [24.9301, 60.1609]
  },
  "isPOBox": false,
  "sources": ["Postnord", "OSM", "Google Maps"],
  "notes": "Main shopping area in Helsinki"
}
```

### 5.2 Summary Statistics
- Total codes analyzed: 208
- Real locations: X%
- P.O. Boxes: X%
- Special purpose: X%
- Unverified: X%
- Geographic distribution (by region)

---

## Phase 6: Known Challenges

1. **P.O. Box vs. Street Address**: Sometimes overlapping
2. **Closed/Inactive codes**: Postal codes that no longer exist
3. **API access**: Not all Finnish databases have public APIs
4. **Accuracy**: Manual verification needed for edge cases
5. **Language barrier**: Finnish place names, municipality names
6. **Rate limiting**: Web scraping may hit limits

---

## Phase 7: Recommended Approach (Priority Order)

### Step 1: Manual Verification (High Priority)
- Sample 20-30 postal codes manually
- Use Postnord.fi, Google Maps, OSM
- Identify patterns

### Step 2: Web Scraping
- Build scraper for Postnord Finland website
- Extract city, address type, P.O. Box indicators
- Handle rate limiting

### Step 3: API Integration
- Try OSM Nominatim for coordinates
- Google Maps for verification
- Build cache to avoid repeated queries

### Step 4: Classification Rules
- Based on manual findings, create heuristic rules
- Apply to all 208 codes
- Manual review of ambiguous cases

### Step 5: Final Report
- Generate CSV/JSON with classifications
- Confidence scores
- Geographic visualization (map)
- Summary statistics

---

## Deliverables

1. **postal_codes_classified.csv** - All codes with classification
2. **analysis_report.md** - Findings and methodology
3. **python_script.py** - Reusable analysis code
4. **verification_notes.txt** - Manual research findings
5. **geospatial_data.geojson** - Map-ready format

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Research & Planning | 1-2 hours | Ready |
| Manual Sample Verification | 2-3 hours | Ready |
| Web Scraping Setup | 2-3 hours | Ready |
| Data Collection | 4-6 hours | Ready |
| Analysis & Classification | 2-3 hours | Ready |
| Report Generation | 1-2 hours | Ready |
| **Total** | **~15-20 hours** | **Ready to start** |

---

## Next Steps

1. Approve this plan
2. Prioritize which approach to start with
3. Gather API credentials (Google Maps, etc.)
4. Begin manual verification sampling
5. Develop classification script

**Molt** 🦎
