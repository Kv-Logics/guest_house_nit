const fs = require('fs');
const path = require('path');

const dirsToCreate = [
    // Backend modular architecture
    'backend/src/controllers',
    'backend/src/services',
    'backend/src/repositories',
    'backend/src/middlewares',
    'backend/src/routes',
    'backend/src/utils',
    'backend/src/db',
    
    // Frontend modular architecture
    'frontend/src/layouts',
    'frontend/src/routes',
    'frontend/src/components/ui'
];

// Create directories
dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const fileMoves = {
    // 1. Move misplaced frontend files out of backend
    'backend/MainLayout.jsx': 'frontend/src/layouts/MainLayout.jsx',
    'backend/ProtectedRoute.jsx': 'frontend/src/routes/ProtectedRoute.jsx',
    'backend/StatusBadge.jsx': 'frontend/src/components/ui/StatusBadge.jsx',

    // 2. Move backend loose files into src/
    'backend/approval.controller.js': 'backend/src/controllers/approval.controller.js',
    'backend/auth.controller.js': 'backend/src/controllers/auth.controller.js',
    'backend/reception.controller.js': 'backend/src/controllers/reception.controller.js',

    'backend/approval.service.js': 'backend/src/services/approval.service.js',
    'backend/auth.service.js': 'backend/src/services/auth.service.js',
    'backend/workflow.service.js': 'backend/src/services/workflow.service.js',
    'backend/reception.service.js': 'backend/src/services/reception.service.js',
    'backend/notification.service.js': 'backend/src/services/notification.service.js',
    'backend/bookingService.js': 'backend/src/services/booking.service.js',

    'backend/approval.repository.js': 'backend/src/repositories/approval.repository.js',
    'backend/booking.repository.js': 'backend/src/repositories/booking.repository.js',
    'backend/workflow.repository.js': 'backend/src/repositories/workflow.repository.js',
    'backend/audit.repository.js': 'backend/src/repositories/audit.repository.js',

    'backend/approval.routes.js': 'backend/src/routes/approval.routes.js',
    'backend/auth.routes.js': 'backend/src/routes/auth.routes.js',
    'backend/reception.routes.js': 'backend/src/routes/reception.routes.js',

    'backend/workflow.middleware.js': 'backend/src/middlewares/workflow.middleware.js',

    'backend/constants.js': 'backend/src/utils/constants.js',
    'backend/response.js': 'backend/src/utils/response.js',
    'backend/stateMachine.js': 'backend/src/utils/stateMachine.js',
    'backend/transaction.js': 'backend/src/utils/transaction.js',
    'backend/auditLogger.js': 'backend/src/utils/auditLogger.js',
    
    'backend/db.js': 'backend/src/db/db.js'
};

for (const [src, dest] of Object.entries(fileMoves)) {
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`Moved ${src} -> ${dest}`);
    }
}

console.log("\n✅ Folder structure fixed! Files moved into modular src/ directories.");