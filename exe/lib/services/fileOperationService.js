const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');
const compressing = require('compressing'); //解压缩用，unzip解压大的文件有点问题
class FileOperation {
    constructor() {}
    /**
     * @function copyFile
     * @description 复制文件、文件夹
     * @param {*} srcPath 源路径
     * @param {*} tarPath 目标路径
     * @returns
     */
    copyFile(srcPath, tarPath) {
        //先判断是文件夹复制还是文件复制
        var srcStats = fs.statSync(srcPath);
        if (srcStats) {
            let isSrcFile = srcStats.isFile();
            if (isSrcFile) {
                //都是文件直接复制就行了
                return fs.copyFileSync(srcPath, tarPath);
            }
        }
        //判断结束，不是文件，是文件夹的复制
        var files = fs.readdirSync(srcPath);
        if (!files) {
            return files;
        }
        // 兼容旧工程,去掉1.0.0.1目录
        if (files.includes('1.0.0.1')) {
            // fs.renameSync(path.join(srcPath, '1.0.0.1/project'), path.join(srcPath, 'project'));
            this.copyFile(path.join(srcPath, '1.0.0.1'), srcPath);
            fs.rmdirSync(path.join(srcPath, '1.0.0.1'), { recursive: true, force: true });
            fs.copyFileSync(path.join(__DIR, `/solutions/project_demo/project/externalconfig.json`), path.join(srcPath, 'project/externalconfig.json'));
            files = fs.readdirSync(srcPath);
        }
        var exist = fs.existsSync(tarPath);
        if (!exist) {
            fs.mkdirSync(tarPath);
        }
        var self = this;
        files.forEach(function (filename) {
            let filedir = path.join(srcPath, filename);
            var stats = fs.statSync(filedir);
            if (stats) {
                let isFile = stats.isFile();
                if (isFile) {
                    // 复制文件
                    const destPath = path.join(tarPath, filename);
                    fs.copyFileSync(filedir, destPath);
                } else {
                    // 创建文件夹
                    let tarFiledir = path.join(tarPath, filename);
                    if (!fs.existsSync(tarFiledir)) {
                        fs.mkdirSync(tarFiledir);
                    }
                    self.copyFile(filedir, tarFiledir); // 递归
                }
            }
        });
        return true;
    }
    /**
     * @function zipDirectory
     * @description 压缩文件夹
     * @param {} path
     * @returns
     */
    zipDirectory(dirPath, projectName, callback) {
        var self = this;
        var fileNameArray = this.listDirectoryAndFiles(dirPath);
        if (fileNameArray.length <= 0) {
            res.send('failed');
            return;
        }
        // var zipDir = __dirname.substring(0, __dirname.length - 3) + "temp"; //zip存储路径
        var zipDir = path.join(__dirname, '../../../../../sdb/filestation');
        let exists = fs.existsSync(zipDir);
        if (!exists) {
            fs.mkdirSync(zipDir);
        }
        let pathName = path.basename(path.resolve(dirPath, '..'));
        zipDir = path.join(zipDir, '/' + pathName);
        exists = fs.existsSync(zipDir);
        if (!exists) {
            fs.mkdirSync(zipDir);
        }
        zipDir = path.join(zipDir, '/export');
        exists = fs.existsSync(zipDir);
        if (!exists) {
            fs.mkdirSync(zipDir);
        }
        var pos = dirPath.lastIndexOf('/');
        pos = pos > dirPath.lastIndexOf('\\') ? pos : dirPath.lastIndexOf('\\');
        //const zipName = dirPath.slice(dirPath.lastIndexOf('/')+1) + '.zip'; //压缩文件名
        var fileNames = dirPath.slice(pos + 1);
        const zipName = projectName + '.zip'; //压缩文件名
        var zipFile = zipDir + '/' + zipName;
        if (fs.existsSync(zipFile)) {
            fs.unlinkSync(zipFile);
        }
        var dirPathEx = dirPath.slice(0, pos) + '/@zgbackup/';
        if (fs.existsSync(dirPathEx) == false) {
            fs.mkdirSync(dirPathEx);
        }
        var dirPathChange = dirPathEx + fileNames;
        var self = this;
        this.copyDirectory(dirPath, dirPathChange);
        try {
            compressing.zip
                .compressDir(dirPathChange, zipFile)
                .then(() => {
                    logger.log('debug', 'success');
                    self.deleteDirectory(dirPathEx);
                    callback(undefined, zipFile);
                })
                .catch((err) => {
                    self.deleteDirectory(dirPathEx);
                    logger.log('warn', err);
                });
        } catch (error) {
            logger.log('warn', error);
        }

        return zipFile;
    }
    /**
     * @function zipDirectory
     * @description 解压缩文件夹
     * @param {} path
     * @returns
     */
    unzipDirectory(srcFileName, dstFilePath, callback) {
        if (!fs.existsSync(dstFilePath)) {
            fs.mkdirSync(dstFilePath);
        }
        compressing.zip
            .uncompress(srcFileName, dstFilePath)
            .then(() => {
                return callback(undefined);
            })
            .catch((err) => {
                logger.log('warn', err);
                return callback(err);
            });
        return;
        //}
    }
    /**
     * @function
     * @description 路径下 文件列表
     * @param {} path
     * @returns
     */
    listDirectoryAndFiles(filepath) {
        var result = [];
        var indexLength = filepath.length;
        var self = this;
        listName(filepath);
        return result;

        function listName(filepath) {
            var files = fs.readdirSync(filepath);
            files.forEach(function (item, index) {
                var fPath = path.join(filepath, item);
                var stat = fs.statSync(fPath);
                if (stat.isDirectory() === true) {
                    result.push(fPath.slice(indexLength + 1));
                    listName(fPath);
                }
                if (stat.isFile() === true) {
                    result.push(fPath.slice(indexLength + 1));
                }
            });
        }
    }
    /**
     * @function copyDirectory
     * @description 复制目录文件
     * @param {} path
     * @returns
     */
    copyDirectory(src, dest) {
        if (fs.existsSync(dest) == false) {
            fs.mkdirSync(dest);
        }
        if (fs.existsSync(src) == false) {
            return false;
        }

        var dirs = fs.readdirSync(src);
        var self = this;
        dirs.forEach(function (item) {
            var item_path = path.join(src, item);
            var temp = fs.statSync(item_path);
            if (temp.isFile()) {
                fs.copyFileSync(item_path, path.join(dest, item));
            } else if (temp.isDirectory()) {
                self.copyDirectory(item_path, path.join(dest, item));
            }
        });
    }
    /**
     * @function deleteDirectory
     * @description 删除目录文件
     * @param {} path
     * @returns
     */
    deleteDirectory(dir) {
        if (fs.existsSync(dir) == true) {
            var files = fs.readdirSync(dir);
            var self = this;
            files.forEach(function (item) {
                var item_path = path.join(dir, item);
                if (fs.statSync(item_path).isDirectory()) {
                    self.deleteDirectory(item_path);
                } else {
                    fs.unlinkSync(item_path);
                }
            });
            fs.rmdirSync(dir);
        }
    }
    upload(req, res) {
        /* 生成multiparty对象，并配置上传目标路径 */
        var form = new multiparty.Form();
        /* 设置编辑 */
        form.encoding = 'utf-8';

        var zipDir = path.join(__dirname, '../../../../../sdb/filestation');
        let exists = fs.existsSync(zipDir);
        if (!exists) {
            fs.mkdirSync(zipDir);
        }
        zipDir = path.join(zipDir, '/kingioserver');
        exists = fs.existsSync(zipDir);
        if (!exists) {
            fs.mkdirSync(zipDir);
        }
        zipDir = path.join(zipDir, '/import');
        exists = fs.existsSync(zipDir);
        if (!exists) {
            fs.mkdirSync(zipDir);
        }
        //设置文件存储路径
        form.uploadDir = '../../../../sdb/filestation/kingioserver/import';
        //设置文件大小限制
        form.maxFilesSize = 800 * 1024 * 1024;
        // form.maxFields = 1000;  //设置所有文件的大小总和
        //上传后处理
        var self = this;
        form.parse(req, function (err, fields, files) {
            if (err) {
                logger.log('warn', 'upload parse error:' + err);
            } else {
                switch (fields.functionName[0]) {
                    // case 'importSolution':
                    //     {
                    //         files.file[0].user = fields.user[0];
                    //         files.file[0].session = req.session; //bug11835,导入工程组失败
                    //         self.importSolution(files.file[0], res);
                    //     }
                    //     break;
                    case 'importSolutionProject':
                        {
                            files.file[0].solutionName = fields.solutionName[0];
                            files.file[0].projectGroupType = fields.projectGroupType[0];
                            files.file[0].session = req.session; //bug11835,导入工程组失败
                            self.importSolutionProject(files.file[0], res);
                        }
                        break;
                    case 'importSolutionProjects':
                        {
                            let options = {};
                            options.files = files;
                            options.solutionName = fields.solutionName[0];
                            options.nameInfo = JSON.parse(fields.nameInfo[0]);
                            options.session = req.session;
                            // added by wenjie.zhang for 获取请求开源IP at 20220625
                            options.headers = req.headers;
                            // ended added by wenjie.zhang for 获取请求开源IP at 20220625
                            self.importSolutionProjects(options, res);
                        }
                        break;
                    case 'installSolutionProjectNormal':
                        {
                            files.file[0].solutionName = fields.solutionName[0];
                            files.file[0].projectName = fields.projectName[0];
                            self.installSolutionProjectNormal(files.file[0], res);
                        }
                        break;
                    case 'checkImportSolutionFile':
                        {
                            self.checkImportSolutionFile(files.file[0], res);
                        }
                        break;
                    case 'checkImportProjectFile':
                        {
                            self.checkImportProjectFile(files.file[0], res);
                        }
                        break;
                    case 'installSolutionProjectNormalFolder':
                        {
                            files.solutionName = fields.solutionName[0];
                            files.projectName = fields.projectName[0];
                            files.fileinfo = fields.fileinfo[0];
                            files.len = fields.len[0];
                            self.installSolutionProjectNormalFolder(files, res);
                        }
                        break;
                    case 'importSSLFile':
                        self.importSSLFile(files, fields.solutionName[0], fields.projectName[0], fields.name[0], res);
                        break;
                    default:
                        break;
                }
            }
        });
    }
    /**
     * @function IsFileExist
     * @description 查询当前文件是否存在
     * @param {*} fileName
     * @returns
     */
    IsFileExist(fileName) {
        var newfs = require('fs');
        if (newfs.existsSync(fileName)) {
            if (newfs.statSync(fileName).isFile()) {
                return 1;
            }
        }
        return 0;
    }
}
module.exports = new FileOperation();
