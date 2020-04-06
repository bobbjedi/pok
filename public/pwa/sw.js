console.log('Sw init')
importScripts('sw-toolbox.js');
toolbox.precache([
    '/index.html',
    '/styles/noty.css',
    '/socket.io/socket.io.js',
    '/libs/easyrtc.min.js'
]);
toolbox.router.get('/images/*', toolbox.cacheFirst);
toolbox.router.get('/favicon/*', toolbox.cacheFirst);
toolbox.router.get('/*', toolbox.networkFirst, { networkTimeoutSeconds: 5 });