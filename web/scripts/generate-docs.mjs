import fs from 'node:fs/promises';
import path from 'node:path';

const webDir = path.resolve(import.meta.dirname, '..');
const vaultDir = path.resolve(webDir, '..');
const generatedDocsDir = path.join(webDir, 'generated', 'docs');

const excludedTopLevelDirs = new Set([
  '.git',
  '.github',
  '.obsidian',
  'web',
  'node_modules',
]);

const assetExtensions = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.svg',
  '.webp',
]);

const normalizePath = (value) => value.split(path.sep).join('/');

const toTitle = (filePath) => path.basename(filePath, path.extname(filePath));

const yamlString = (value) => JSON.stringify(value.replace(/\r?\n/g, ' '));

const slugSegment = (value, fallback = 'item') => {
  const slug = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
};

const headingSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-');

const ensureUniquePath = (relativePath, usedPaths) => {
  if (!usedPaths.has(relativePath)) {
    usedPaths.add(relativePath);
    return relativePath;
  }

  const extension = path.extname(relativePath);
  const withoutExtension = relativePath.slice(0, -extension.length);
  let counter = 2;

  while (usedPaths.has(`${withoutExtension}-${counter}${extension}`)) {
    counter += 1;
  }

  const uniquePath = `${withoutExtension}-${counter}${extension}`;
  usedPaths.add(uniquePath);
  return uniquePath;
};

const collator = new Intl.Collator('cs', {numeric: true, sensitivity: 'base'});

const walk = async (directory, shouldSkipDir = () => false) => {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  const sortedEntries = entries.sort((a, b) => collator.compare(a.name, b.name));
  const files = [];

  for (const entry of sortedEntries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!shouldSkipDir(fullPath, entry.name)) {
        files.push(...(await walk(fullPath, shouldSkipDir)));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

const copyFileEnsuringDir = async (from, to) => {
  await fs.mkdir(path.dirname(to), {recursive: true});
  await fs.copyFile(from, to);
};

const relativeMarkdownLink = (fromGeneratedRel, toGeneratedRel, anchor = '') => {
  let link = normalizePath(path.relative(path.dirname(fromGeneratedRel), toGeneratedRel));

  if (!link.startsWith('.')) {
    link = `./${link}`;
  }

  return `${link}${anchor}`;
};

const assetLink = (fromGeneratedRel, assetGeneratedRel) => {
  let link = normalizePath(path.relative(path.dirname(fromGeneratedRel), assetGeneratedRel));

  if (!link.startsWith('.')) {
    link = `./${link}`;
  }

  return link;
};

const parseWikiTarget = (rawTarget) => {
  const [targetAndHeading, alias] = rawTarget.split('|');
  const [target, heading] = targetAndHeading.split('#');

  return {
    target: target.trim(),
    heading: heading?.trim() ?? '',
    alias: alias?.trim() ?? '',
  };
};

const collectNotes = async () => {
  const allFiles = await walk(vaultDir, (fullPath, name) => {
    const relative = path.relative(vaultDir, fullPath);
    return !relative.includes(path.sep) && excludedTopLevelDirs.has(name);
  });

  return allFiles
    .filter((filePath) => path.extname(filePath).toLowerCase() === '.md')
    .map((filePath) => ({
      sourceAbs: filePath,
      sourceRel: normalizePath(path.relative(vaultDir, filePath)),
      title: toTitle(filePath),
    }));
};

const collectAssets = async () => {
  const allFiles = await walk(vaultDir, (fullPath, name) => {
    const relative = path.relative(vaultDir, fullPath);
    return !relative.includes(path.sep) && excludedTopLevelDirs.has(name);
  });

  return allFiles
    .filter((filePath) => assetExtensions.has(path.extname(filePath).toLowerCase()))
    .map((filePath) => ({
      sourceAbs: filePath,
      sourceRel: normalizePath(path.relative(vaultDir, filePath)),
      generatedRel: normalizePath(path.join('assets', path.relative(vaultDir, filePath))),
    }));
};

const buildGeneratedPaths = (notes) => {
  const usedPaths = new Set();

  for (const note of notes) {
    if (note.sourceRel.toLowerCase() === 'readme.md') {
      note.generatedRel = ensureUniquePath('index.md', usedPaths);
      continue;
    }

    const sourceParts = note.sourceRel.split('/');
    const fileName = sourceParts.pop();
    const generatedParts = sourceParts.map((part) => slugSegment(part, 'folder'));
    const generatedFileName = `${slugSegment(path.basename(fileName, '.md'), 'note')}.md`;

    note.generatedRel = ensureUniquePath(
      normalizePath(path.join(...generatedParts, generatedFileName)),
      usedPaths,
    );
  }
};

const buildIndexes = (notes, assets) => {
  const noteIndex = new Map();
  const assetIndex = new Map();

  for (const note of notes) {
    const titleKey = note.title.toLowerCase();
    const sourceKey = note.sourceRel.toLowerCase();
    noteIndex.set(titleKey, note);
    noteIndex.set(sourceKey, note);
    noteIndex.set(sourceKey.replace(/\.md$/i, ''), note);
  }

  for (const asset of assets) {
    assetIndex.set(asset.sourceRel.toLowerCase(), asset);
    assetIndex.set(path.basename(asset.sourceRel).toLowerCase(), asset);
  }

  return {noteIndex, assetIndex};
};

const convertWikiEmbeds = (content, note, assetIndex) =>
  content.replace(/!\[\[([^\]]+)\]\]/g, (match, rawTarget) => {
    const {target, alias} = parseWikiTarget(rawTarget);
    const asset = assetIndex.get(target.toLowerCase()) ?? assetIndex.get(path.basename(target).toLowerCase());

    if (!asset) {
      return match;
    }

    const alt = alias || path.basename(target, path.extname(target));
    return `![${alt}](${assetLink(note.generatedRel, asset.generatedRel)})`;
  });

const convertWikiLinks = (content, note, noteIndex) =>
  content.replace(/\[\[([^\]]+)\]\]/g, (match, rawTarget) => {
    const {target, heading, alias} = parseWikiTarget(rawTarget);
    const targetNote = noteIndex.get(target.toLowerCase());

    if (!targetNote) {
      return alias || target || match;
    }

    const label = alias || heading || targetNote.title;
    const anchor = heading ? `#${headingSlug(heading)}` : '';
    return `[${label}](${relativeMarkdownLink(note.generatedRel, targetNote.generatedRel, anchor)})`;
  });

const convertMarkdownAssetLinks = (content, note, assetIndex) =>
  content.replace(/(!?\[[^\]]*\]\()([^):#][^)]+)(\))/g, (match, prefix, rawTarget, suffix) => {
    const target = rawTarget.trim();

    if (/^(https?:|mailto:|tel:|#|\/)/i.test(target)) {
      return match;
    }

    const cleanedTarget = decodeURI(target.split(/[?#]/)[0]).replace(/\\/g, '/');
    const asset =
      assetIndex.get(cleanedTarget.toLowerCase()) ??
      assetIndex.get(path.basename(cleanedTarget).toLowerCase());

    if (!asset) {
      return match;
    }

    return `${prefix}${assetLink(note.generatedRel, asset.generatedRel)}${suffix}`;
  });

const demoteTopLevelHeadings = (content) => content.replace(/^# /gm, '## ');

const addFrontMatter = (note, content, sidebarPosition) => {
  const frontMatter = [
    '---',
    `title: ${yamlString(note.sourceRel.toLowerCase() === 'readme.md' ? 'Úvod' : note.title)}`,
    `sidebar_position: ${sidebarPosition}`,
  ];

  if (note.sourceRel.toLowerCase() === 'readme.md') {
    frontMatter.push('slug: /');
  }

  frontMatter.push('---', '');

  return `${frontMatter.join('\n')}${content.trimStart()}`;
};

const protectMarkdownCode = (content, transform) => {
  const protectedSnippets = [];
  const placeholderPrefix = 'CODEX_PROTECTED_MARKDOWN_SNIPPET';
  const protectedContent = content.replace(/```[\s\S]*?```|`[^`\n]*`/g, (match) => {
    const placeholder = `${placeholderPrefix}_${protectedSnippets.length}__`;
    protectedSnippets.push(match);
    return placeholder;
  });

  const transformed = transform(protectedContent);

  return protectedSnippets.reduce(
    (current, snippet, index) => current.replace(`${placeholderPrefix}_${index}__`, snippet),
    transformed,
  );
};

const convertContent = (source, note, noteIndex, assetIndex) =>
  protectMarkdownCode(source, (content) => {
    let converted = convertMarkdownAssetLinks(content, note, assetIndex);
    converted = convertWikiEmbeds(converted, note, assetIndex);
    converted = convertWikiLinks(converted, note, noteIndex);

    if (note.sourceRel.toLowerCase() !== 'readme.md') {
      converted = demoteTopLevelHeadings(converted);
    }

    return converted;
  });

const writeCategories = async (notes) => {
  const categoryPositions = new Map();
  let nextTopLevelPosition = 1;

  for (const note of notes) {
    const sourceParts = note.sourceRel.split('/').slice(0, -1);
    const generatedParts = note.generatedRel.split('/').slice(0, -1);

    for (let index = 0; index < sourceParts.length; index += 1) {
      const generatedDirRel = generatedParts.slice(0, index + 1).join('/');

      if (!categoryPositions.has(generatedDirRel)) {
        categoryPositions.set(generatedDirRel, nextTopLevelPosition);
        nextTopLevelPosition += 1;
      }

      const categoryPath = path.join(generatedDocsDir, generatedDirRel, '_category_.json');
      const category = {
        label: sourceParts[index],
        position: categoryPositions.get(generatedDirRel),
        collapsible: true,
        collapsed: true,
      };

      await fs.mkdir(path.dirname(categoryPath), {recursive: true});
      await fs.writeFile(categoryPath, `${JSON.stringify(category, null, 2)}\n`, 'utf8');
    }
  }
};

const main = async () => {
  await fs.rm(generatedDocsDir, {recursive: true, force: true});
  await fs.mkdir(generatedDocsDir, {recursive: true});

  const notes = await collectNotes();
  const assets = await collectAssets();

  buildGeneratedPaths(notes);
  const {noteIndex, assetIndex} = buildIndexes(notes, assets);

  for (const asset of assets) {
    await copyFileEnsuringDir(asset.sourceAbs, path.join(generatedDocsDir, asset.generatedRel));
  }

  await writeCategories(notes);

  const notePositions = new Map();

  for (const note of notes) {
    const generatedDir = path.dirname(note.generatedRel);
    const nextPosition = (notePositions.get(generatedDir) ?? 0) + 1;
    notePositions.set(generatedDir, nextPosition);

    const source = await fs.readFile(note.sourceAbs, 'utf8');
    const converted = convertContent(source, note, noteIndex, assetIndex);

    await fs.mkdir(path.dirname(path.join(generatedDocsDir, note.generatedRel)), {recursive: true});
    await fs.writeFile(
      path.join(generatedDocsDir, note.generatedRel),
      addFrontMatter(note, converted, nextPosition),
      'utf8',
    );
  }

  console.log(`Generated ${notes.length} docs and ${assets.length} assets in ${normalizePath(path.relative(vaultDir, generatedDocsDir))}`);
};

await main();
