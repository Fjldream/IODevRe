const { projectGroup } = require('../../../controllers');
/** Exports **/
module.exports = {
    'get': {
        '/group': [projectGroup.getAllProjectGroups],
        '/groupRoles': [projectGroup.getGroupRoles],
    },
    'post': {
        '/group': [projectGroup.createProjectGroup],
        '/groupRoles': [projectGroup.assignRolesToGroup],
    },
    'put': {
        '/group': [projectGroup.updateProjectGroup],
    },
    'delete': {
        '/group': [projectGroup.deleteProjectGroup],
        '/groupRoles': [projectGroup.removeRolesFromGroup],
    },
};
