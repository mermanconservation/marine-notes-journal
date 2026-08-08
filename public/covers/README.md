# Issue & Volume Covers (git-backed)

Cover images for volumes and issues live here in the repository — **not** in cloud storage —
so the public site renders them even when the backend is paused.

## Naming convention

```
public/covers/vol{VOLUME}-iss{ISSUE}.jpg
```

Example: `public/covers/vol1-iss1.jpg`

## How to add a cover

1. In the admin Content Manager (`/admin/content`), pick the issue and choose the image file.
   The tool renames it to the correct filename and downloads it.
2. Commit the downloaded file into `public/covers/`.
3. Commit the updated `src/data/issues.json` (the tool sets `coverUrl` for you).
