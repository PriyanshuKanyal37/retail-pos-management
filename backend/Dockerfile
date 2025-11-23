FROM python:3.11.9-slim

WORKDIR /app

# Copy requirements
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy whole backend
COPY backend/ .

EXPOSE 8000

# Start Uvicorn and expand PORT correctly on Railway
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
