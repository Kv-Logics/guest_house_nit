const fs = require('fs');
const path = require('path');

const dirsToCreate = [
    'backend',
    'frontend/src/components',
    'frontend/src/pages',
    'frontend/src/api',
];

// Create directories
dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const fileMoves = {
    // Backend Files
    'server.js': 'backend/server.js',
    'db.js': 'backend/db.js',
    'bookingService.js': 'backend/bookingService.js',
    'schema.sql': 'backend/schema.sql',
    'seed.js': 'backend/seed.js',
    
    // Frontend Core Files
    'App.jsx': 'frontend/src/App.jsx',
    'main.jsx': 'frontend/src/main.jsx',
    'index.css': 'frontend/src/index.css',
    'tailwind.config.js': 'frontend/tailwind.config.js',
    'bookingApi.js': 'frontend/src/api/bookingApi.js',
    
    // Frontend Components & Pages
    'BookingForm.jsx': 'frontend/src/components/BookingForm.jsx',
    'RoomSummaryCard.jsx': 'frontend/src/components/RoomSummaryCard.jsx',
    'LoadingSpinner.jsx': 'frontend/src/components/LoadingSpinner.jsx',
    'BookingPage.jsx': 'frontend/src/pages/BookingPage.jsx',
    'SuccessPage.jsx': 'frontend/src/pages/SuccessPage.jsx',
    'ErrorPage.jsx': 'frontend/src/pages/ErrorPage.jsx',
};

for (const [src, dest] of Object.entries(fileMoves)) {
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`Moved ${src} -> ${dest}`);
    }
}
console.log("\n✅ Done organizing! Don't forget to move your package.json and .env files manually.");