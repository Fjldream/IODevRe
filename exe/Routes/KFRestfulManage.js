const bodyParser = require('body-parser');
const express = require('express');
const router = express.Router();
const path = require('path')
const fs = require('fs')
const {
    getNowDTStr
} = require('../core/utils/function_util');
const {
    upload
} = require('../core/utils');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: true
}));
const strDataPath = path.join(__dirname, '../')
const strDriverPath = path.join(strDataPath, "Driver/DriverInfo.json")

function isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType) {
    for (let i = 0; i < objDriverInfo.DriverList.length; i++) {
        if (strDriverName == objDriverInfo.DriverList[i].DriverName && strProvider == objDriverInfo.DriverList[i].DriverCompany &&
            strSysPlatform == objDriverInfo.DriverList[i].SysPlatform && strDriverVersion == objDriverInfo.DriverList[i].DriverVersion &&
            strPlatformType == objDriverInfo.DriverList[i].PlatformType) {
            return {
                flag: true,
                objDriverInfo: objDriverInfo.DriverList[i]
            }
        }
    }
    return {
        flag: false
    }
}
/**
 * @description 下载驱动ini文件
 */
router.post('/installMQTTDriverConf', function (req, res) {
    try {
        let fileStation = path.join(__dirname, '../../../../sdb/filestation/kingioserver/driver/dependFile')
        if (!fs.existsSync(fileStation)) {
            fs.mkdirSync(fileStation, {
                recursive: true
            })
        }
        let resultPath = [];
        let strDriverName = req.body.DriverName;
        let strProvider = req.body.ProviderName;
        let strSysPlatform = req.body.SysPlatform;
        let strDriverVersion = req.body.DriverVersion;
        let strPlatformType = req.body.PlatformType;
        let dependFile = req.body.DependFileName;
        let objDriverInfo = JSON.parse(fs.readFileSync(strDriverPath, 'utf-8'));
        let {
            flag
        } = isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType)
        if (!flag) return res.send({
            code: -1,
            message: '找不到该驱动信息'
        })
        let driverPath = path.join(strDataPath, 'Driver', strSysPlatform, strPlatformType, strProvider, strDriverName, strDriverVersion)
        let filePath = path.join(driverPath, dependFile)
        fs.copyFileSync(filePath, path.join(fileStation, dependFile))
        resultPath.push('kingioserver/driver/dependFile/' + dependFile)
        res.send({
            code: 0,
            message: 'success',
            data: resultPath
        })
    } catch (error) {
        res.send({
            code: 500,
            message: error.message
        })
    }
})
router.post('/uploadMQTTDriverConf', upload.driverDependencyUpload.single('uploadFile'), (req, res) => {
    try {
        let driverInfo = JSON.parse(req.body.driverInfo)
        let strDriverName = driverInfo.DriverName;
        let strProvider = driverInfo.ProviderName;
        let strSysPlatform = driverInfo.SysPlatform;
        let strDriverVersion = driverInfo.DriverVersion;
        let strPlatformType = driverInfo.PlatformType;
        let objDriverInfo = JSON.parse(fs.readFileSync(strDriverPath, 'utf-8'));
        let {
            flag
        } = isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType)
        if (!flag) return res.send({
            code: -1,
            message: '找不到该驱动信息'
        })
        let driverFilePath = path.join(strDataPath, 'Driver', strSysPlatform, strPlatformType, strProvider, strDriverName, strDriverVersion, req.file.originalname)
        if(!fs.existsSync(driverFilePath)){
            return res.send({
                code: -1,
                message: '配置文件不存在，不允许上传',
            })
        }
        fs.writeFileSync(driverFilePath, req.file.buffer)
        res.send({
            code: 0,
            message: 'success',
        })
    } catch (error) {
        res.send({
            code: 500,
            message: error.message
        });
    }
})
router.get('/getPointMappingFiles',async function (req, res) {
    try {
        let strDriverName = req.query.DriverName;
        let strProvider = req.query.ProviderName;
        let strSysPlatform = req.query.SysPlatform;
        let strDriverVersion = req.query.DriverVersion;
        let strPlatformType = req.query.PlatformType;
        let pointMapDir = req.query.pointMapDir;
        let objDriverInfo = JSON.parse(fs.readFileSync(strDriverPath, 'utf-8'));
        let {
            flag
        } = isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType)
        if (!flag) return res.send({
            code: -1,
            message: '找不到该驱动信息'
        })
        let pointFilePath = path.join(strDataPath, 'Driver', strSysPlatform, strPlatformType, strProvider, strDriverName, strDriverVersion, pointMapDir)
        let fileArr = fs.readdirSync(pointFilePath, { withFileTypes : true })
        let arrPointMappingArr = fileArr.filter(e => e.isFile()).map(e => e.name)
        res.send({
            code: 0,
            message: 'success',
            data: arrPointMappingArr
        })
    } catch (error) {
        res.send({
            code: 500,
            message: error.message
        });
    }


})
router.post('/pointMappingFileDownload', function (req, res) {
    try {
        let fileStation = path.join(__dirname, '../../../../sdb/filestation/kingioserver/driver/pointMapping')
        if (!fs.existsSync(fileStation)) {
            fs.mkdirSync(fileStation, {
                recursive: true
            })
        }
        let successArr = [];
        let failedArr = [];
        let strDriverName = req.body.DriverName;
        let strProvider = req.body.ProviderName;
        let strSysPlatform = req.body.SysPlatform;
        let strDriverVersion = req.body.DriverVersion;
        let strPlatformType = req.body.PlatformType;
        let pointFileArr = req.body.files;
        let objDriverInfo = JSON.parse(fs.readFileSync(strDriverPath, 'utf-8'));
        let pointMapDir = req.body.PointMapDir
        let {
            flag
        } = isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType)
        if (!flag) return res.send({
            code: -1,
            message: '找不到该驱动信息'
        })
        let pointFilePath = path.join(strDataPath, 'Driver', strSysPlatform, strPlatformType, strProvider, strDriverName, strDriverVersion, pointMapDir)
        let arrDriverFiles = fs.readdirSync(pointFilePath); //获取该驱动到底有哪些文件
        pointFileArr.forEach(item => {
            if (arrDriverFiles.includes(item)) {
                let filePath = path.join(pointFilePath, item)
                fs.copyFileSync(filePath, path.join(fileStation, item))
                successArr.push('kingioserver/driver/pointMapping/' + item)
            } else {
                failedArr.push(item);
            }
        })
        res.send({
            code: 0,
            message: 'success',
            failedArr,
            successArr
        })
    } catch (error) {
        res.send({
            code: 500,
            message: error.message
        })
    }
})
router.post('/uploadPointMappingFile', upload.driverDependencyUpload.single('uploadFile'), (req, res) => {
    try {
        let driverInfo = JSON.parse(req.body.driverInfo)
        let strDriverName = driverInfo.DriverName;
        let strProvider = driverInfo.ProviderName;
        let strSysPlatform = driverInfo.SysPlatform;
        let strDriverVersion = driverInfo.DriverVersion;
        let strPlatformType = driverInfo.PlatformType;
        let objDriverInfo = JSON.parse(fs.readFileSync(strDriverPath, 'utf-8'));
        let pointMapDir = driverInfo.PointMapDir
        let {
            flag
        } = isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType)
        if (!flag) return res.send({
            code: -1,
            message: '找不到该驱动信息'
        })
        let pointDirPath = path.join(strDataPath, 'Driver', strSysPlatform, strPlatformType, strProvider, strDriverName, strDriverVersion, pointMapDir)
        let pointFilePath = path.join(pointDirPath, req.file.originalname)
        fs.writeFileSync(pointFilePath, req.file.buffer)
        res.send({
            code: 0,
            message: 'success',
        })
    } catch (error) {
        res.send({
            code: 500,
            message: error.message
        });
    }
})
router.delete('/delPointMappingFile', (req, res) => {
    try {
        let strDriverName = req.body.DriverName;
        let strProvider = req.body.ProviderName;
        let strSysPlatform = req.body.SysPlatform;
        let strDriverVersion = req.body.DriverVersion;
        let strPlatformType = req.body.PlatformType;
        let pointFileArr = req.body.pointFileArr;
        let objDriverInfo = JSON.parse(fs.readFileSync(strDriverPath, 'utf-8'));
        let pointMapDir = req.body.PointMapDir
        let {
            flag
        } = isExistDriver(objDriverInfo, strDriverName, strProvider, strSysPlatform, strDriverVersion, strPlatformType)
        if (!flag) return res.send({
            code: -1,
            message: '找不到该驱动信息'
        })
        let pointFilePath = path.join(strDataPath, 'Driver', strSysPlatform, strPlatformType, strProvider, strDriverName, strDriverVersion, pointMapDir)
        let arrPointMappingArr = fs.readdirSync(pointFilePath); //获取该驱动到底有哪些文件
        pointFileArr.forEach(item => {
            if (arrPointMappingArr.includes(item)) {
                fs.unlinkSync(path.join(pointFilePath, item))
            }
        })
        res.send({
            code: 0,
            message: 'success',
        })
    } catch (error) {
        res.send({
            code: 500,
            message: error.message
        });
    }
})
module.exports = router;