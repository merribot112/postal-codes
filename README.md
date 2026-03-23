# Postal Codes Project

Scraping and organizing Finnish postal code data from Posti (Finland's postal service).

## Structure

```
postal_codes/
├── postal_codes.txt         # List of 197 postal codes to scrape
├── scraper.js               # Puppeteer-based web scraper
├── summarize_results.py     # Analyze and summarize scraped data
└── data/                    # Scraped results (JSON files by postal code)
    ├── 00001.json
    ├── 00017.json
    └── ...
```

## Data Format

Each file in `data/` is named by postal code and contains:

```json
{
  "postal_code": "00001",
  "municipalities": ["HELSINKI", "HELSINGFORS"],
  "total_addresses": 2044,
  "scraped_at": "2026-03-23T14:52:00Z"
}
```

### Fields

- **postal_code**: Finnish postal code (5 digits)
- **municipalities**: List of municipality names (Finnish and Swedish variants)
- **total_addresses**: Total number of addresses/streets in that postal code
- **scraped_at**: ISO timestamp when data was scraped

## Usage

### Run Scraper

```bash
cd /home/molt/.openclaw/workspace/postal_codes
node scraper.js
```

### Summarize Results

```bash
python3 summarize_results.py
```

## Source

Data scraped from: https://www.posti.fi/postinumerohaku

## Notes

- Scraper includes 1-second rate limiting between requests
- Respects server load
- Handles errors gracefully (saved in error field)
