# Custom Domain Setup for OnGoPool 🚗

This guide will help you set up a custom domain for your OnGoPool rideshare application.

## 🎯 Recommended Domain Options

### Premium Domains (Professional)
- `ongopool.com` - Primary recommendation
- `ongopool.ca` - Canada-focused (.ca domain)
- `rideongopool.com` - Descriptive alternative
- `goongopool.com` - Action-oriented

### Budget-Friendly Alternatives
- `ongopool.net` - Professional alternative
- `ongopool.org` - Community-focused
- `ongopool.app` - Modern app domain
- `ongopool.co` - Short and modern

## 📋 Domain Setup Process

### Step 1: Purchase Your Domain
**Recommended Registrars:**
- **Namecheap** - Best value, excellent support
- **Google Domains** - Easy integration
- **GoDaddy** - Popular choice
- **Cloudflare** - Advanced features

### Step 2: Configure DNS Records
Once you own a domain, add these DNS records in your registrar's control panel:

#### For Root Domain (ongopool.com):
```
Type: A
Name: @ (or leave blank)
Value: 185.199.108.153
TTL: 300

Type: A  
Name: @ (or leave blank)
Value: 185.199.109.153
TTL: 300

Type: A
Name: @ (or leave blank) 
Value: 185.199.110.153
TTL: 300

Type: A
Name: @ (or leave blank)
Value: 185.199.111.153
TTL: 300
```

#### For WWW Subdomain:
```
Type: CNAME
Name: www
Value: harman698-art.github.io
TTL: 300
```

### Step 3: Update GitHub Repository
1. **Upload CNAME file** (already created) to your repository
2. **Go to GitHub**: Settings → Pages → Custom domain
3. **Enter your domain**: `ongopool.com`
4. **Enable HTTPS**: Check "Enforce HTTPS"

### Step 4: SSL Certificate (Automatic)
GitHub Pages will automatically provision an SSL certificate for your custom domain. This may take 5-15 minutes.

## ⚡ Quick Setup Examples

### Example 1: Namecheap Setup
1. Log into Namecheap account
2. Go to Domain List → Manage
3. Click "Advanced DNS"
4. Add the A records and CNAME record above
5. Wait 10-30 minutes for propagation

### Example 2: Cloudflare Setup  
1. Add domain to Cloudflare
2. Update nameservers at your registrar
3. Add DNS records in Cloudflare dashboard
4. Enable "Proxied" status for better performance

## 🔍 Testing Your Domain

### Check DNS Propagation:
- Visit: `https://dnschecker.org/`
- Enter your domain
- Verify A records point to GitHub IPs

### Test Your Site:
1. Wait 10-30 minutes after DNS changes
2. Visit: `https://yourdomain.com`
3. Verify SSL certificate is working (lock icon)

## 📊 Cost Breakdown

| Domain Extension | Annual Cost | Best For |
|-----------------|-------------|----------|
| .com | $10-15 | Professional, universal |
| .ca | $15-20 | Canada-specific |
| .net | $12-18 | Tech-focused alternative |
| .app | $18-25 | Modern app branding |
| .co | $25-35 | Short, memorable |

## 🚨 Important Notes

1. **CNAME File**: Must be in repository root (already created)
2. **DNS Propagation**: Can take up to 48 hours globally
3. **HTTPS**: GitHub provides free SSL certificates
4. **Email**: You'll need separate email hosting (Google Workspace, etc.)

## 🎯 Business Recommendations

### For OnGoPool Branding:
1. **Primary**: `ongopool.com` - Most professional
2. **Regional**: `ongopool.ca` - Canada-focused
3. **Alternative**: `rideongopool.com` - Descriptive

### Marketing Benefits:
- **Professional credibility** with custom domain
- **Better SEO** rankings
- **Easy to remember** and share
- **Email addresses** (contact@ongopool.com)

## 📧 Next Steps After Domain Setup

1. **Professional Email**: Set up contact@ongopool.com
2. **Google Analytics**: Track website visitors
3. **Google Search Console**: Monitor SEO performance  
4. **Social Media**: Update bio links to new domain

---

**Need help with domain setup?** Contact your registrar's support team with this guide - they can help configure the DNS records.