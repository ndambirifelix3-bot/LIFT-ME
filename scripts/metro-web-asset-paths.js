// Metro asset plugin for the website build only (LIFTME_WEB_EXPORT=1, set by `npm run build:web`).
//
// Fonts and icons from scoped packages are published under paths with an "@", e.g.
// /assets/node_modules/@expo-google-fonts/inter/... . Cloudflare re-encodes "@" as "%40" and some
// browsers then loop on redirects, so the fonts never load. This renames "/@scope" to "/at-scope" in
// the published path; the file is written to that path and the app asks for that same path.
// The phone apps and the dev server are not affected.
module.exports = function webAssetPaths(asset) {
  if (process.env.LIFTME_WEB_EXPORT === '1' && typeof asset.httpServerLocation === 'string') {
    asset.httpServerLocation = asset.httpServerLocation.replace(/\/(@|%40)/g, '/at-');
  }
  return asset;
};
