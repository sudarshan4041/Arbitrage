#!/bin/bash

# DipBot Deployment Script for Vultr VPS

echo "🚀 Starting DipBot deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Certbot for SSL
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/dipbot
sudo chown -R $USER:$USER /var/www/dipbot

# Clone or copy application files
echo "📋 Copying application files..."
# If using git:
# git clone https://github.com/yourusername/dipbot.git /var/www/dipbot
# Or copy files from current directory:
cp -r ./* /var/www/dipbot/

# Navigate to app directory
cd /var/www/dipbot

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Set up environment file
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit /var/www/dipbot/.env with your actual credentials"
fi

# Set up Nginx
echo "🔧 Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/dipbot
sudo ln -sf /etc/nginx/sites-available/dipbot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Set up SSL with Certbot (commented out for initial setup)
# echo "🔒 Setting up SSL certificate..."
# sudo certbot --nginx -d dip.stingfu.com --non-interactive --agree-tos --email your-email@example.com

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Set up firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Edit /var/www/dipbot/.env with your actual credentials"
echo "2. Run: sudo certbot --nginx -d dip.stingfu.com"
echo "3. Restart PM2: pm2 restart dipbot-auth"
echo "4. Check status: pm2 status"
echo "5. View logs: pm2 logs dipbot-auth"