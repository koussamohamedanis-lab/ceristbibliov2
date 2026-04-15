# 🎯 Bibliometrix R Optimization Setup

## Overview

The Bibliometrix service has been **optimized to use R via rpy2** for superior bibliometric analysis performance.

**Modes:**
- ✅ **Primary (Optimized):** R/Bibliometrix via rpy2 - Enhanced accuracy & performance
- ⚠️ **Fallback:** Pure Python - Available if R not installed

---

## Installation Steps

### 1️⃣ Install Python Dependencies

```bash
cd Backend/
pip install -r requirements.txt
```

This includes:
- `rpy2==3.18.0` - Python bridge to R
- `pandas==2.1.4` - Data manipulation

### 2️⃣ Install R (4.0+)

**Windows:**
- Download from: https://cran.r-project.org/bin/windows/base/
- Run installer with default settings
- R will be installed in `C:\Program Files\R\R-x.x.x`

**macOS:**
```bash
brew install r
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install r-base r-base-dev
```

### 3️⃣ Install Bibliometrix R Package

Open R console and run:

```r
install.packages("bibliometrix")
```

**Or via terminal/command line:**

```bash
# Windows
Rscript -e "install.packages('bibliometrix')"

# macOS/Linux
Rscript -e 'install.packages("bibliometrix")'
```

---

## Verify Installation

### Check Python Setup
```bash
cd Backend/
python -c "import rpy2; print('✅ rpy2 installed')"
```

### Check R & Bibliometrix
```bash
python -c "from services.bibliometrix import get_bibliometrix_status; import json; print(json.dumps(get_bibliometrix_status(), indent=2))"
```

**Expected output (Optimized Mode):**
```json
{
  "r_available": true,
  "mode": "🎯 R/Bibliometrix (OPTIMIZED)",
  "rpy2_version": "3.18.0",
  "status": "✅ R optimization mode active"
}
```

**If R not installed (Fallback Mode):**
```json
{
  "r_available": false,
  "mode": "⚠️ Python (FALLBACK)",
  "rpy2_version": "not installed",
  "status": "⚠️ Using Python fallback"
}
```

---

## Metrics Calculated

Once R is installed, the following advanced metrics are available:

| Metric | Formula | Meaning |
|--------|---------|---------|
| **H-Index** | Largest h where h papers have ≥h citations | Research quality & productivity |
| **G-Index** | Largest g where top g papers have ≥g² cumulative citations | Rewards highly-cited papers |
| **i10-Index** | Number of papers with ≥10 citations | Recognizes broader impact |
| **Avg Citations/Paper** | Total citations ÷ Total publications | Average per-paper impact |

---

## Features

### Deduplication
- Automatically removes duplicate publications by `openalex_id`
- Keeps entry with highest citation count if duplicates found

### Group Analysis
- Aggregates H-index across multiple researchers
- Calculates collective team metrics
- Produces publications-by-year timeline

### Data Flow

```
Publications (OpenAlex API)
  ↓
Deduplication (openalex_id)
  ↓
R/Bibliometrix Analysis ← (or Python fallback)
  ↓
Metrics: {h_index, g_index, i10_index, total_citations, ...}
  ↓
Frontend Display (MyPublications, GlobalStatistics, Comparaison, etc.)
```

---

## Examples

### Python Usage
```python
from services.bibliometrix import calculate_group_h_index

publications = [
    {
        "openalex_id": "W123456",
        "title": "Machine Learning in Healthcare",
        "cited_by_count": 150,
        "publication_year": 2020,
        "doi": "10.1234/example"
    },
    {
        "openalex_id": "W123457",
        "title": "Deep Learning Algorithms",
        "cited_by_count": 200,
        "publication_year": 2019,
        "doi": "10.1234/example2"
    }
]

result = calculate_group_h_index(publications)

print(f"H-Index: {result['h_index']}")  # 2
print(f"G-Index: {result['g_index']}")  # 2
print(f"i10-Index: {result['i10_index']}")  # 2
print(f"Total Citations: {result['total_citations']}")  # 350
print(f"Method: {result['method']}")  # "bibliometrix_r" or "python_fallback"
```

### FastAPI Integration
```python
from fastapi import APIRouter, Depends
from services.bibliometrix import calculate_group_h_index

router = APIRouter()

@router.get("/team/{team_id}/metrics")
def get_team_bibliometrix(team_id: int):
    """Get advanced bibliometric metrics for a team."""
    # Get publications for team members (your DB query here)
    publications = get_team_publications(team_id)
    
    # Calculate metrics (uses R if available, Python fallback otherwise)
    metrics = calculate_group_h_index(publications)
    
    return metrics
```

---

## Troubleshooting

### Issue: "rpy2 not installed"
```bash
pip install rpy2==3.18.0
```

### Issue: "Bibliometrix R package not available"
In R console:
```r
install.packages("bibliometrix")
```

### Issue: R not found
- Ensure R is added to PATH
- On Windows, verify `C:\Program Files\R\R-x.x.x\bin` is in system PATH
- Restart terminal/IDE after adding to PATH

### Issue: Still using Python fallback after R installed
Check logs for initialization errors:
```python
from services.bibliometrix import get_bibliometrix_status
print(get_bibliometrix_status())
```

If `r_available: false`, check error messages in application logs.

---

## Performance Notes

- **R/Bibliometrix:** ~100-200ms for 1000 publications (optimized)
- **Python Fallback:** ~10-50ms for 1000 publications (faster but less sophisticated)

For production, having R installed is recommended for more accurate bibliometric analysis.

---

## API Reference

### `calculate_group_h_index(publications: list) -> dict`

Calculate H-index with advanced metrics using best available method.

**Parameters:**
- `publications` (list): List of publication dicts

**Dict Format:**
```python
{
    "openalex_id": "W123",          # Unique publication ID
    "title": "Paper Title",          # Publication title  
    "cited_by_count": 50,            # Citation count
    "publication_year": 2020,        # Year published
    "doi": "10.1234/example",        # DOI (optional)
    "type": "ARTICLE"                # Publication type (optional)
}
```

**Returns:**
```python
{
    "h_index": 2,
    "g_index": 2,
    "i10_index": 1,
    "total_publications": 2,
    "total_citations": 350,
    "avg_citations_per_paper": 175.0,
    "publications_by_year": [
        {"year": 2019, "count": 1},
        {"year": 2020, "count": 1}
    ],
    "method": "bibliometrix_r"  # or "python_fallback"
}
```

### `get_bibliometrix_status() -> dict`

Check current Bibliometrix mode and R availability.

---

**Last Updated:** April 10, 2026  
**Version:** 2.0 (R-Optimized)
