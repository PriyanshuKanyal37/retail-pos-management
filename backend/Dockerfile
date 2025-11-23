FROM python:3.11.9-slim

# Create working directory
WORKDIR /app

# Copy requirements from backend folder
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ .

# Expose port (Railway sets PORT automatically)
EXPOSE 8000

# Run the app
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
