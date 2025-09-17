// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure cheerio is bundled on the server runtime
      config.externals = config.externals.map(external =>
        typeof external === 'function'
          ? (ctx, req, cb) =>
              req === 'cheerio' ? cb() : external(ctx, req, cb)
          : external
      );
    }
    return config;
  }
};
