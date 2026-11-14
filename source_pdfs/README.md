# Source PDFs for Spoken English

Drop full multi-day Spoken English PDFs here (e.g. `Spoken_English_Day9_Day10.pdf`).

When you commit or upload a PDF to this folder:
1. GitHub Actions (`.github/workflows/sync-spoken-english.yml`) will automatically detect it.
2. It slices it into individual class & day PDFs in `Portal/spoken_pdf/`.
3. It updates `Portal/data/spoken-english-lessons.js` with full Telugu checklists and metadata.
4. It syncs the lessons and checklists into Supabase database via the `syllabus-api` Edge Function.
