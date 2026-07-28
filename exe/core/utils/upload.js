/**
 * @name upload.js
 * @desc 有关上传接口所需方法
 * @auth jinlong.feng
 * @date 2025-07-08
 * @version 1.0.0.1
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../../../../sdb/filestation/kingioserver/upload');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // 只允许ZIP文件
        if (path.extname(file.originalname).toLowerCase() === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed'), false);
        }
    },
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
}).array('uploadFiles', 10);
const driverDependencyUpload = multer({
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    storage:multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // 只允许ZIP文件
        // if (path.extname(file.originalname).toLowerCase() === '.ini'||path.extname(file.originalname).toLowerCase() === '.json') {
            cb(null, true);
        // } else {
            // cb(new Error('Only .ini or .json files are allowed'), false);
        // }
    },
})
module.exports = {
    upload,
    driverDependencyUpload
};
