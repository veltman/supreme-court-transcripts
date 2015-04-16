# supreme-court-transcripts
Attempting to parse supreme court oral argument transcripts.

## Requirements

Install pdftk: http://www.pdflabs.com/docs/install-pdftk/
Install qpdf: `brew install qpdf`
Install poppler: `brew install poppler`

## Getting transcripts

```
mkdir raw pdf json
npm install

# Scrape 2010-2014 transcripts
node scrape.js

# Remove empty password junk as needed?
#for f in $(ls raw); do qpdf --decrypt raw/$f pdf/$f; done

# Convert PDFs to JSON arrays of pages, each page an array of lines, filtering out empty lines
node convert.js
```

The third step is necessary because some of the files have empty passwords on them, so they're openable but they appear to have a password when opened by pdf-extract.

## Analysis

Only transcripts for Term Year 2004+ attribute questions to individual justices in the transcript.  Prior to that, all questions are just listed as "QUESTION:".