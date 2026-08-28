FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install dependencies first (separate layer → cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (overridden by volume mount in dev docker-compose)
COPY . .

# Expose the port uvicorn listens on
EXPOSE 8000

# Default command — docker-compose overrides this with --reload for dev
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
