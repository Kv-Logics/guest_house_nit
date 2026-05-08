const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = './uploads/documents';

// Ensure the upload directory exists, creating it if necessary.
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Created document upload directory at: ${UPLOAD_DIR}`);
}

// Configure multer's disk storage to define where and how files are saved.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename to prevent overwrites.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Define a filter to strictly accept only PDF and PNG files.
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('File type not supported. Only PDF and PNG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB size limit
    fileFilter: fileFilter
});

module.exports = upload;