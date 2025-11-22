#!/bin/bash
set -e

# Install Python dependencies
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# Install Node dependencies and setup Prisma
npm install
npx prisma generate
npx prisma migrate deploy

