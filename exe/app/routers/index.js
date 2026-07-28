const router = require('express').Router();
const { midware_response, midware_tenantId, midware_auth } = require('../../core/middlewares');
router.use(midware_response);
router.use(require('../../core/middlewares/midware_i18n'));
router.use(midware_tenantId);
router.use(midware_auth.extractUserInfo);

const RouteLoader = require('../../lib/routers/route_loader');
const fresh = new RouteLoader.constructor();
fresh.routerContainer = require('./api/v1');
fresh.registerRoutes(router);
module.exports = router;
