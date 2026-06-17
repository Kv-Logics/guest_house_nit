const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(r => {
        content = content.replace(r.search, r.replace);
    });
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// Frontend changes
const frontendFiles = [
    'frontend/src/utils/constants.js',
    'frontend/src/App.jsx',
    'frontend/src/components/layout/Navbar.jsx',
    'frontend/src/pages/dashboard/ManagePayments.jsx',
    'frontend/src/routes/ProtectedRoute.jsx'
];

frontendFiles.forEach(file => {
    let fullPath = path.resolve(process.cwd(), file);
    if(fs.existsSync(fullPath)) {
        replaceInFile(fullPath, [
            { search: /ROLES\.ADMIN,\s*/g, replace: '' },
            { search: /,\s*ROLES\.ADMIN/g, replace: '' },
            { search: /ADMIN:\s*'super_admin',\s*\n/g, replace: '' },
            { search: /user\.role === 'super_admin'\s*\?\s*'System Admin'\s*:\s*/g, replace: '' }
        ]);
    }
});

// Backend changes
const backendFiles = [
    'backend/scripts/importAllData.js',
    'backend/scripts/seed.js',
    'backend/src/config/constants.js',
    'backend/src/routes/booking.routes.js',
    'backend/src/routes/bulkBooking.routes.js',
    'backend/src/routes/bulkStayRecords.routes.js',
    'backend/src/routes/coordinator.routes.js',
    'backend/src/routes/payment.routes.js',
    'backend/src/routes/reception.routes.js',
    'backend/src/routes/system.routes.js',
    'backend/src/services/approval.service.js',
    'backend/src/services/booking.service.js',
    'backend/src/services/reception.service.js',
    'backend/src/utils/constants.js'
];

backendFiles.forEach(file => {
    let fullPath = path.resolve(process.cwd(), file);
    if(fs.existsSync(fullPath)) {
        replaceInFile(fullPath, [
            { search: /'super_admin',\s*/g, replace: '' },
            { search: /,\s*'super_admin'/g, replace: '' },
            { search: /ADMIN:\s*'super_admin',\s*\n/g, replace: '' },
            { search: /\(1,\s*'super_admin',\s*'System Administrator'\),\s*\n/g, replace: '' },
            { search: /\(1,\s*'super_admin',\s*'System Administrator'\)\s*ON CONFLICT/g, replace: 'ON CONFLICT' }
        ]);
    }
});

console.log('Removal complete.');
