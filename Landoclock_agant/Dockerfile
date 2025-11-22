# Use Python 3.11 base image
FROM python:3.11-slim

# Install Node.js (for Prisma)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files and install Node dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
# Generate Prisma client using Python (to match prisma-client-py version)
RUN python3 -m prisma generate

# Copy application code
COPY . .

# Copy Python startup script and make it executable
COPY start.py .
RUN chmod +x start.py

# Expose port (default 3001, Railway will override with PORT env var)
EXPOSE 3001

# Start the application using the Python startup script
# Python reads environment variables more reliably than shell scripts
CMD ["python", "start.py"]

