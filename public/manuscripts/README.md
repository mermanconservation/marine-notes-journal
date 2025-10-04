# Marine Notes Journal - Manuscript Archive

This directory contains published manuscripts organized by year.

## Directory Structure

```
manuscripts/
├── 2024/
├── 2025/
├── 2026/
├── 2027/
└── 2028/
```

## Adding New Articles

### Step 1: Upload PDF
1. Place the manuscript PDF in the appropriate year folder
2. Name it using the DOI format: `MNJ-YYYY-###.pdf`
   - Example: `MNJ-2026-001.pdf`

### Step 2: Update articles.json
Edit `src/data/articles.json` and add a new entry:

```json
{
  "id": 2,
  "doi": "MNJ-2026-002",
  "title": "Your Article Title",
  "authors": "Author1, A., Author2, B., Author3, C.",
  "type": "Research",
  "publicationDate": "2026-06-15",
  "pdfUrl": "/manuscripts/2026/MNJ-2026-002.pdf",
  "resolverUrl": "https://www.marinenotesjournal.com/doi/MNJ-2026-002",
  "volume": "1",
  "issue": "2",
  "abstract": "Your article abstract here..."
}
```

### Step 3: Update Sequence
Increment the `nextSequence` number in `articles.json`:
```json
"nextSequence": 3
```

## Article Types
- **Research**: Original research articles
- **Notes**: Short research notes
- **Review**: Review articles
- **Case Study**: Case study reports

## DOI Format
Format: `MNJ-YYYY-###`
- **MNJ**: Marine Notes Journal prefix
- **YYYY**: Publication year (4 digits)
- **###**: Sequential number (3 digits, padded with zeros)

Examples:
- `MNJ-2026-001`
- `MNJ-2026-002`
- `MNJ-2026-042`

## Resolver URLs
Each article is accessible via:
- Direct URL: `https://www.marinenotesjournal.com/doi/MNJ-YYYY-###`
- This automatically resolves to the article page with download options
