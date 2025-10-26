# How to Add Manuscripts to the Archive

When you upload a new manuscript PDF to GitHub, follow these steps to make it appear in the archive:

## Step 1: Upload PDF to GitHub

Upload your PDF file to the appropriate year folder:
- `public/manuscripts/2026/` for 2026 publications
- `public/manuscripts/2027/` for 2027 publications
- etc.

## Step 2: Update articles.json

Edit `src/data/articles.json` and add a new article entry:

```json
{
  "id": [next number],
  "doi": "MNJ-[YEAR]-[NUMBER]",
  "title": "Your Article Title",
  "authors": "Author1, Author2, Author3",
  "orcidIds": ["0000-0001-xxxx-xxxx"],
  "type": "Research Article",
  "publicationDate": "2026-06-01",
  "pdfUrl": "/manuscripts/2026/your-filename.pdf",
  "resolverUrl": "https://www.marinenotesjournal.com/doi/MNJ-[YEAR]-[NUMBER]",
  "volume": "1",
  "issue": "1",
  "abstract": "Your abstract here",
  "metrics": {
    "citations": 0,
    "downloads": 0,
    "views": 0,
    "altmetricScore": 0,
    "socialShares": 0
  }
}
```

## Article Types

Available types:
- Research Article
- Review Article
- Short Communication
- Field Notes
- Observational Reports
- Conservation News
- Case Study
- Methodology Paper

## Step 3: Update nextSequence

Increment the `nextSequence` number at the bottom of articles.json to reflect the next available article ID.

## Step 4: Commit and Push

Once you push to GitHub, the article will automatically appear in the archive with:
- Type label
- Download button
- Organized by volume and issue
- Searchable and filterable
