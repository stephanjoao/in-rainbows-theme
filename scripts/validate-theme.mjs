import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const colorPattern = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

async function readJson(path) {
  const fullPath = resolve(rootDir, path);
  const source = await readFile(fullPath, "utf8");

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

async function assertFileExists(path) {
  try {
    await access(resolve(rootDir, path));
  } catch {
    throw new Error(`${path} does not exist.`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectColorValues(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectColorValues(item, [...path, index]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => collectColorValues(item, [...path, key]));
  }

  if (typeof value === "string" && value.startsWith("#")) {
    return [{ path: path.join("."), value }];
  }

  return [];
}

function normalizeColorBase(value) {
  const raw = value.slice(1).toLowerCase();
  const expanded = raw.length === 3 || raw.length === 4
    ? raw.split("").map((character) => character + character).join("")
    : raw;

  return `#${expanded.slice(0, 6)}`;
}

const radioheadColorFamilies = [
  "maize",
  "tufts-blue",
  "flame",
  "mantis",
  "amber",
  "off-red",
  "non-photo-blue"
];

function isNeutralColorName(name) {
  return name === "pure-black"
    || name === "pure-white"
    || name === "rainbow-white"
    || name === "eigengrau";
}

function isRadioheadColorName(name) {
  return radioheadColorFamilies.includes(name);
}

const [manifest, palette, testWorkspace] = await Promise.all([
  readJson("package.json"),
  readJson("colors.json"),
  readJson(".vscode/theme-test.code-workspace")
]);

const packageDescription = "A VS Code theme inspired by the critically and publicly aclaimed album 'In Rainbows' by Radiohead.";
const contributedThemes = manifest.contributes?.themes ?? [];
const contributedLabels = contributedThemes.map((item) => item.label);
const allowedUiThemes = new Set(["vs", "vs-dark", "hc-black", "hc-light"]);

assert(manifest.name, "package.json must include a name.");
assert(manifest.displayName, "package.json must include a displayName.");
assert(manifest.description === packageDescription, "package.json description must stay unchanged.");
assert(manifest.publisher, "package.json must include a publisher.");
assert(manifest.license && manifest.license !== "TODO", "package.json must include a real license value.");
assert(manifest.repository?.url && !manifest.repository.url.includes("TODO"), "package.json must include a real repository URL.");
assert(manifest.scripts?.validate === "node scripts/validate-theme.mjs", "package.json must expose npm run validate.");
assert(manifest.scripts?.["vscode:prepublish"] === "npm run validate", "package.json must validate before publishing.");
assert(Array.isArray(contributedThemes) && contributedThemes.length > 0, "package.json must contribute at least one theme.");

if (manifest.icon) {
  await assertFileExists(manifest.icon);
}

for (const contribution of contributedThemes) {
  assert(contribution.label, "Each contributed theme must include a label.");
  assert(allowedUiThemes.has(contribution.uiTheme), `${contribution.label} must use a valid uiTheme.`);
  assert(contribution.path, `${contribution.label} must include a theme path.`);

  await assertFileExists(contribution.path);

  const theme = await readJson(contribution.path);

  assert(theme.name, `${contribution.path} must include a name.`);
  assert(theme.name === contribution.label, `${contribution.path} name must match its contributed theme label.`);
  assert(theme.colors && typeof theme.colors === "object", `${contribution.path} must include a colors object.`);
  assert(Array.isArray(theme.tokenColors), `${contribution.path} must include a tokenColors array.`);

  for (const { path, value } of collectColorValues(theme)) {
    assert(colorPattern.test(value), `Theme color at "${contribution.path}:${path}" is not a valid hex color.`);
  }
}

assert(
  contributedLabels.includes(testWorkspace.settings?.["workbench.colorTheme"]),
  ".vscode/theme-test.code-workspace must select one of the contributed themes."
);

for (const [name, value] of Object.entries(palette)) {
  if (name.startsWith("_")) {
    continue;
  }

  assert(colorPattern.test(value), `colors.json entry "${name}" is not a valid hex color.`);
  assert(
    isNeutralColorName(name) || isRadioheadColorName(name),
    `colors.json entry "${name}" must be either an Eigengrau neutral or a Radiohead base color.`
  );
}

const paletteEntries = Object.entries(palette)
  .filter(([name]) => !name.startsWith("_"))
  .map(([name, value]) => ({
    name,
    value,
    base: normalizeColorBase(value)
  }));

const paletteNamesByBase = new Map();

for (const { name, base } of paletteEntries) {
  const existingNames = paletteNamesByBase.get(base) ?? [];
  paletteNamesByBase.set(base, [...existingNames, name]);
}

const documentedPaletteBases = new Set(
  Object.entries(palette)
    .filter(([name]) => !name.startsWith("_"))
    .map(([, value]) => normalizeColorBase(value))
);

for (const requiredColor of ["#000000", "#ffffff", "#16161d", "#f5f5fa"]) {
  assert(documentedPaletteBases.has(requiredColor), `colors.json must include ${requiredColor}.`);
}

for (const contribution of contributedThemes) {
  const theme = await readJson(contribution.path);

  for (const { path, value } of collectColorValues(theme)) {
    const baseColor = normalizeColorBase(value);
    const paletteNames = paletteNamesByBase.get(baseColor) ?? [];
    const isNeutral = paletteNames.some(isNeutralColorName);
    const isRadioheadColor = paletteNames.some(isRadioheadColorName);

    assert(
      documentedPaletteBases.has(baseColor),
      `Theme color at "${contribution.path}:${path}" uses ${value}, but base ${baseColor} is not documented in colors.json.`
    );
    assert(
      isNeutral || isRadioheadColor,
      `Theme color at "${contribution.path}:${path}" uses ${value}, but base ${baseColor} is not an Eigengrau neutral or a Radiohead base color.`
    );
  }
}

console.log("Theme validation passed.");
