#!/bin/bash

# Quick setup script to run on fresh Vultr VPS
# Run this after SSH into your VPS

echo "🎯 DipBot VPS Quick Setup"
echo "========================"

# Create app directory
mkdir -p /var/www/dipbot
cd /var/www/dipbot

# Download deployment script
echo "📥 Downloading deployment files..."
# You'll need to upload files first, then run:
# scp -r DipBot/* root@YOUR_VPS_IP:/var/www/dipbot/

# Run the main deployment
if [ -f deploy.sh ]; then
    chmod +x deploy.sh
    ./deploy.sh
else
    echo "❌ deploy.sh not found. Please upload the DipBot folder to /var/www/dipbot/"
    echo "Use: scp -r DipBot/* root@YOUR_VPS_IP:/var/www/dipbot/"
fi