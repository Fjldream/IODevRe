const { project } = require('../../../controllers');
const { midware_auth } = require('../../../../core/middlewares/index');
/** Exports **/
module.exports = {
    'get': {
        '/projectList': [midware_auth.checkProjectGroupAccess, project.getProjectsByGroupId],
        '/projectById': [project.getProjectsById],
        '/share': [midware_auth.checkProjectWriteAccess, project.getProjectSharedUsers],
        // 判断当前用户是否创建了工程
        '/isUserCreateProject': [project.isUserCreateProject],
    },
    'post': {
        '/createProject': [midware_auth.checkProjectGroupAccess, project.createProject],
        '/share': [midware_auth.checkProjectWriteAccess, project.shareProject],
        '/exportProject': [midware_auth.checkProjectArrWriteAccess, project.exportProject],
        '/importProjects': [project.importProjects],
    },
    'put': {
        '/updateProject': [midware_auth.checkProjectWriteAccess, project.updateProject],
    },
    'delete': {
        '/deleteProject': [midware_auth.checkProjectDeleteAccess, project.deleteProject],
        '/share': [midware_auth.checkProjectWriteAccess, project.unshareProject],
        '/share/all': [midware_auth.checkProjectAdminAccess, project.clearProjectShares],
    },
};
