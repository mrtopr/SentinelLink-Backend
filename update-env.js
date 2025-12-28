const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('.env not found');
    process.exit(1);
}

let content = fs.readFileSync(envPath, 'utf8');
const oldOrigins = 'CORS_ORIGINS="http://localhost:3000,http://localhost:5173"';
const newOrigins = 'CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:5174"';

if (content.includes(oldOrigins)) {
    content = content.replace(oldOrigins, newOrigins);
    fs.writeFileSync(envPath, content);
    console.log('Successfully updated CORS_ORIGINS');
} else if (content.includes('CORS_ORIGINS')) {
    console.log('CORS_ORIGINS already updated or different format');
    // Check if it already has 5174
    if (content.includes('5174')) {
        console.log('5174 is already present');
    } else {
        // Force update the line if it starts with CORS_ORIGINS
        content = content.split('\n').map(line => {
            if (line.startsWith('CORS_ORIGINS=')) {
                return `CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:5174"`;
            }
            return line;
        }).join('\n');
        fs.writeFileSync(envPath, content);
        console.log('Forced update of CORS_ORIGINS');
    }
} else {
    console.error('CORS_ORIGINS key not found');
}
