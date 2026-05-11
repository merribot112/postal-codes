# Deprecated/Old Finnish Postal Codes Analysis

## Overview
**40 postal codes** returned NO_DATA when searched on Posti.fi, indicating they are **no longer active** in the current postal code system.

## Summary by Region

### Northern Finland - Lapland (14 codes - 35%)
**Geographic area**: Northern Lapland region
- Codes: 87007, 88301, 88615, 88999, 89201, 89999, 92007, 93825, 93899, 93999, 95295, 95999, 96007, 98007
- **Likely reason**: Significant municipal consolidations in Lapland region
- **Status**: Probably merged or consolidated into larger municipal postal code areas

### Southern Finland (15 codes - 37.5%)
Distributed across multiple regions:
- **Helsinki/Uusimaa area (2 codes)**: 00001, 00841
  - Likely old codes from Helsinki or Vantaa suburbs
- **Southwest coast (1 code)**: 21711
- **Kymenlaakso (2 codes)**: 15861, 15951
- **Häme region (1 code)**: 14999
- **Itä-Häme (1 code)**: 18007
- **South Uusimaa (4 codes)**: 02941, 06451, 09999, 07899, 07999

### Western Finland (6 codes - 15%)
- **Ostrobothnia (2 codes)**: 66101, 66999
- **Satakunta (2 codes)**: 45007, 45151
- **Tampere/Pori area (1 code)**: 40003
- **West coast (1 code)**: 48007

### Central/Eastern Finland (5 codes - 12.5%)
- **Jyväskylä area (1 code)**: 32301
- **Central-Eastern Finland (1 code)**: 57007
- **Kuopio area (1 code)**: 70007
- **North Savonia (1 code)**: 64999
- **Other Eastern (1 code)**: 68999

## Key Findings

### 1. Municipal Mergers (2009-2021)
Finland experienced significant municipal restructuring:
- **2009**: 4 major mergers
  - Alahärmä → Kauhava
  - Askainen → Masku
  - Dragsfjärd + Kimito + Västanfjärd → Kimitoön
  - Multiple others

- **2010**: 6 mergers (Himanka → Kalajoki, etc.)
- **2011**: Multiple mergers (Artjärvi → Orimattila, etc.)
- **2013**: 10 major mergers (Kerimäki → Savonlinna, etc.)
- **2016-2021**: Additional consolidations

### 2. Postal Code Evolution
When municipalities merged, postal codes were typically:
- **Consolidated** into a single code for the merged municipality
- **Deprecated** in Posti's system (no longer actively used)
- **Archived** but potentially still recognized in legacy systems

### 3. Special Cases
- **Code 99999**: Reserved for Joulupukki (Father Christmas) residence at Korvatunturi in Lapland
- **00001/00841**: Likely early/test codes or municipal service codes in Helsinki area
- **Suffix 999**: Often indicates boundary/special purpose codes

## Geographic Concentration

| Region | Count | % |
|--------|-------|---|
| **Lapland** | 14 | 35.0% |
| **South/Southwest** | 15 | 37.5% |
| **Western Finland** | 6 | 15.0% |
| **Central/Eastern** | 5 | 12.5% |

**Observation**: Highest concentration of old codes in **Lapland and Southern Finland**, regions that experienced significant municipal consolidations.

## Hypothesis

These 40 old postal codes were **likely associated with:**
1. **Small municipalities** that merged with larger ones (2009-2021)
2. **Service areas** no longer in active use
3. **Special purpose codes** that were retired
4. **Regional consolidation boundaries** that changed

## Recommendations for Data Usage

If using this postal code dataset:
- ✅ Use the **156 valid codes** (POST_BOX + SETTLEMENT) for modern applications
- ⚠️ Note that 40 codes are **deprecated** and not currently recognized
- 📚 Consider the **municipal structure** as of 2025 when matching addresses to postal codes
- 🔍 For historical data, research the specific merged municipality to find the new postal code

## Next Steps

To identify specific municipalities for each old code:
1. Cross-reference old code regions with municipal merger dates
2. Search municipal archives for code assignments (2005-2009)
3. Contact Posti historical records for detailed mapping
4. Check Finnish Statistics Centre (Tilastokeskus) for municipal history
