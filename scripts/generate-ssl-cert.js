/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Generate self-signed SSL certificate for HTTPS development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ SSL certificates already exist');
  process.exit(0);
}

try {
  console.log('🔐 Generating self-signed SSL certificate...');

  // Generate private key and certificate
  execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=ToLoveRunner/CN=localhost"`, {
    stdio: 'inherit'
  });

  console.log('✅ SSL certificate generated successfully');
  console.log(`📁 Key: ${keyPath}`);
  console.log(`📁 Cert: ${certPath}`);
  console.log('');
  console.log('🚀 You can now run HTTPS development server with:');
  console.log('   npm run dev:https');

} catch (error) {
  console.error('❌ Failed to generate SSL certificate:', error.message);
  console.log('');
  console.log('💡 Make sure OpenSSL is installed:');
  console.log('   - Windows: Install Git for Windows (includes OpenSSL)');
  console.log('   - macOS: brew install openssl');
  console.log('   - Linux: sudo apt-get install openssl');
  process.exit(1);
}