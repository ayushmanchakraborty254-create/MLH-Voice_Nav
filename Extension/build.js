/**
 * VoxNav - Ultra-Fast ESBuild Bundler
 * Compiles TypeScript source files into zero-dependency bundles for Chrome MV3.
 */

const fs = require("fs");
const path = require("path");

async function runBuild() {
  let esbuild;
  try {
    esbuild = require("esbuild");
  } catch (e) {
    console.log("Installing esbuild...");
    require("child_process").execSync("npm install --save-dev esbuild", { stdio: "inherit" });
    esbuild = require("esbuild");
  }

  const distDir = path.join(__dirname, "dist");
  const distPopup = path.join(distDir, "popup");
  const distOptions = path.join(distDir, "options");

  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  if (!fs.existsSync(distPopup)) fs.mkdirSync(distPopup, { recursive: true });
  if (!fs.existsSync(distOptions)) fs.mkdirSync(distOptions, { recursive: true });

  console.log("⚡ Bundling VoxNav TypeScript source files...");

  // 1. Bundle Background Service Worker
  await esbuild.build({
    entryPoints: [path.join(__dirname, "src/background/service-worker.ts")],
    bundle: true,
    outfile: path.join(distDir, "background.bundle.js"),
    platform: "browser",
    target: ["chrome110"],
    sourcemap: false,
    minify: false
  });

  // 2. Bundle Content Script
  await esbuild.build({
    entryPoints: [path.join(__dirname, "src/content/content-main.ts")],
    bundle: true,
    outfile: path.join(distDir, "content.bundle.js"),
    platform: "browser",
    target: ["chrome110"],
    sourcemap: false,
    minify: false
  });

  // 3. Bundle Popup Script
  await esbuild.build({
    entryPoints: [path.join(__dirname, "src/popup/popup.ts")],
    bundle: true,
    outfile: path.join(distPopup, "popup.bundle.js"),
    platform: "browser",
    target: ["chrome110"],
    sourcemap: false,
    minify: false
  });

  // 4. Bundle Options Script
  await esbuild.build({
    entryPoints: [path.join(__dirname, "src/options/options.ts")],
    bundle: true,
    outfile: path.join(distOptions, "options.bundle.js"),
    platform: "browser",
    target: ["chrome110"],
    sourcemap: false,
    minify: false
  });

  // 5. Copy HTML & CSS assets to dist
  fs.copyFileSync(
    path.join(__dirname, "src/popup/popup.html"),
    path.join(distPopup, "popup.html")
  );
  // Modify script tag in dist popup.html to point to popup.bundle.js
  let popupHtml = fs.readFileSync(path.join(distPopup, "popup.html"), "utf8");
  popupHtml = popupHtml.replace("popup.js", "popup.bundle.js");
  fs.writeFileSync(path.join(distPopup, "popup.html"), popupHtml);

  fs.copyFileSync(
    path.join(__dirname, "src/popup/popup.css"),
    path.join(distPopup, "popup.css")
  );

  fs.copyFileSync(
    path.join(__dirname, "src/options/options.html"),
    path.join(distOptions, "options.html")
  );
  let optionsHtml = fs.readFileSync(path.join(distOptions, "options.html"), "utf8");
  optionsHtml = optionsHtml.replace("options.js", "options.bundle.js");
  fs.writeFileSync(path.join(distOptions, "options.html"), optionsHtml);

  fs.copyFileSync(
    path.join(__dirname, "src/options/options.css"),
    path.join(distOptions, "options.css")
  );

  console.log("✓ Build completed successfully! Dist files are ready in Extension/dist/.");
}

runBuild().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
