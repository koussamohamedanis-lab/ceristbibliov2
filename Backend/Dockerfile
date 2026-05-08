# =====================================================
# Stage 1: Python Backend with R support
# =====================================================
FROM python:3.11-slim

# System dependencies + R installation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    r-base \
    r-base-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R jsonlite package (used by bibliometrix.py)
RUN Rscript -e "install.packages('jsonlite', repos='https://cloud.r-project.org/')"

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Run FastAPI via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
