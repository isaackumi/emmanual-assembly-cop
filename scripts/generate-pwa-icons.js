const fs = require('fs')
const path = require('path')

// Simple SVG icon generator
function generateIcon(size, filename) {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad1)" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">⛪</text>
</svg>
  `.trim()

  const publicDir = path.join(__dirname, '..', 'public')
  const filePath = path.join(publicDir, filename)
  
  fs.writeFileSync(filePath, svg)
  console.log(`Generated ${filename} (${size}x${size})`)
}

// Generate all required icon sizes
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
]

console.log('Generating PWA icons...')

iconSizes.forEach(({ size, name }) => {
  generateIcon(size, name.replace('.png', '.svg'))
})

console.log('PWA icons generated successfully!')
console.log('Note: These are SVG icons. For production, convert to PNG format.')
