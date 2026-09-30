const http = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultEnhancer = config.server.enhanceMiddleware;

// During Expo Go development, send API traffic through Metro's LAN port.
// This lets a physical phone use the same connection as the JS bundle even
// when the network or firewall does not allow direct access to port 4000.
config.server.enhanceMiddleware = (metroMiddleware, metroServer) => {
  const enhancedMetroMiddleware = defaultEnhancer
    ? defaultEnhancer(metroMiddleware, metroServer)
    : metroMiddleware;

  return (request, response, next) => {
    if (!request.url?.startsWith('/api/')) {
      return enhancedMetroMiddleware(request, response, next);
    }

    const proxyHeaders = { ...request.headers, host: '127.0.0.1:4000' };
    // The browser sees this as same-origin Metro traffic. Do not forward Metro's
    // browser Origin to the API and accidentally trigger a cross-origin check.
    delete proxyHeaders.origin;

    const proxyRequest = http.request(
      {
        hostname: '127.0.0.1',
        port: 4000,
        path: request.url,
        method: request.method,
        headers: proxyHeaders,
      },
      (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
        proxyResponse.pipe(response);
      },
    );

    proxyRequest.on('error', () => {
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'application/json' });
      }
      response.end(JSON.stringify({ error: { message: 'The local API is unavailable.' } }));
    });

    request.pipe(proxyRequest);
  };
};

module.exports = config;
