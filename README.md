# D Byk Product Academy

Static site at academy.dbykstore.com. All lessons and daily briefs live in `index.html`.

After adding or changing any lesson or daily brief, rebuild the Library PDFs and commit them:

    node scripts/build-pdfs.js

This writes one PDF per lesson into `pdf/`. The PDFs contain the reading only, never quiz questions or answers.
