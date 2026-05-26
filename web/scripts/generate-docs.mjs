import fs from 'node:fs/promises';
import path from 'node:path';

const webDir = path.resolve(import.meta.dirname, '..');
const vaultDir = path.resolve(webDir, '..');
const generatedDocsDir = path.join(webDir, 'generated', 'docs');
const graphDataPath = path.join(webDir, 'src', 'data', 'graph-data.json');

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

const routeSegment = (value) => value.replace(/^\d+[-_.\s]+/, '');

const docRoute = (note) => {
  if (note.sourceRel.toLowerCase() === 'readme.md') {
    return '/';
  }

  const withoutExtension = note.generatedRel.replace(/\.md$/i, '');
  const routeParts = withoutExtension.split('/').map(routeSegment);

  return `/${routeParts.join('/')}`;
};

const docNodeId = (note) => `doc:${note.generatedRel}`;

const headingNodeId = (note, slug) => `heading:${note.generatedRel}#${slug}`;

const missingNodeId = (target) => `missing:${target.toLowerCase()}`;

const lookupKey = (value) => value.trim().toLowerCase();

const stripMarkdownSyntax = (value) =>
  value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

const textSummary = (content) =>
  stripMarkdownSyntax(content)
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, '$2$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

const collectHeadings = (content) => {
  const headings = [];
  const seenSlugs = new Map();

  protectMarkdownCode(content, (protectedContent) => {
    const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/gm;
    let match;

    while ((match = headingPattern.exec(protectedContent)) !== null) {
      const title = stripMarkdownSyntax(match[2]);

      if (!title) {
        continue;
      }

      const baseSlug = headingSlug(title);
      const count = seenSlugs.get(baseSlug) ?? 0;
      seenSlugs.set(baseSlug, count + 1);

      headings.push({
        title,
        level: match[1].length,
        slug: count === 0 ? baseSlug : `${baseSlug}-${count}`,
        lookupSlugs: count === 0 ? [baseSlug] : [baseSlug, `${baseSlug}-${count}`],
      });
    }

    return protectedContent;
  });

  return headings;
};

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

const resolveHeading = (note, heading) => {
  if (!heading) {
    return null;
  }

  const key = lookupKey(heading);
  const slug = headingSlug(heading);

  return note.headings.find((candidate) =>
    lookupKey(candidate.title) === key || candidate.lookupSlugs.includes(slug)
  ) ?? null;
};

const targetNoteForMarkdownLink = (note, rawTarget, noteIndex) => {
  const cleanTarget = decodeURI(rawTarget.split(/[?#]/)[0]).replace(/\\/g, '/');

  if (!cleanTarget || /^(https?:|mailto:|tel:|#|\/)/i.test(cleanTarget)) {
    return null;
  }

  const resolvedSourceRel = normalizePath(path.join(path.dirname(note.sourceRel), cleanTarget));

  return (
    noteIndex.get(cleanTarget.toLowerCase()) ??
    noteIndex.get(resolvedSourceRel.toLowerCase()) ??
    noteIndex.get(resolvedSourceRel.replace(/\.md$/i, '').toLowerCase()) ??
    null
  );
};

const addGraphLink = (links, linkKeys, link) => {
  const key = `${link.source}|${link.target}|${link.type}|${link.anchor ?? ''}`;

  if (link.source === link.target || linkKeys.has(key)) {
    return;
  }

  linkKeys.add(key);
  links.push(link);
};

const extractGraphLinks = (note, noteIndex, assetIndex, referencedHeadingIds, missingNodes) => {
  const links = [];
  const linkKeys = new Set();

  protectMarkdownCode(note.source, (content) => {
    content.replace(/(!?)\[\[([^\]]+)\]\]/g, (match, embedMarker, rawTarget) => {
      const {target, heading, alias} = parseWikiTarget(rawTarget);
      const source = docNodeId(note);
      const isEmbed = embedMarker === '!';

      if (isEmbed) {
        const asset = assetIndex.get(target.toLowerCase()) ?? assetIndex.get(path.basename(target).toLowerCase());
        if (asset) {
          return match;
        }
      }

      const targetNote = target
        ? noteIndex.get(target.toLowerCase())
        : note;

      if (!targetNote) {
        if (!isEmbed) {
          const missingTitle = alias || target;
          const missingId = missingNodeId(target);
          missingNodes.set(missingId, {
            id: missingId,
            title: missingTitle,
            type: 'missing',
            group: 'Chybějící odkazy',
            url: null,
            sourceRel: target,
          });
          addGraphLink(links, linkKeys, {
            source,
            target: missingId,
            type: 'missing',
            label: missingTitle,
          });
        }
        return match;
      }

      const headingTarget = resolveHeading(targetNote, heading);
      const targetId = headingTarget
        ? headingNodeId(targetNote, headingTarget.slug)
        : docNodeId(targetNote);

      if (headingTarget) {
        referencedHeadingIds.add(targetId);
      }

      addGraphLink(links, linkKeys, {
        source,
        target: targetId,
        type: isEmbed ? 'embed' : (headingTarget ? 'heading' : 'wiki'),
        label: alias || heading || targetNote.title,
        anchor: headingTarget ? `#${headingTarget.slug}` : '',
      });

      return match;
    });

    content.replace(/(!?)\[([^\]]+)\]\(([^)]+)\)/g, (match, imageMarker, label, rawTarget) => {
      if (imageMarker === '!') {
        return match;
      }

      const [pathTarget, hashTarget = ''] = rawTarget.trim().split('#');
      const targetNote = pathTarget
        ? targetNoteForMarkdownLink(note, pathTarget, noteIndex)
        : note;

      if (!targetNote) {
        return match;
      }

      const headingTarget = resolveHeading(targetNote, hashTarget);
      const targetId = headingTarget
        ? headingNodeId(targetNote, headingTarget.slug)
        : docNodeId(targetNote);

      if (headingTarget) {
        referencedHeadingIds.add(targetId);
      }

      addGraphLink(links, linkKeys, {
        source: docNodeId(note),
        target: targetId,
        type: headingTarget ? 'heading' : 'markdown',
        label: stripMarkdownSyntax(label) || targetNote.title,
        anchor: headingTarget ? `#${headingTarget.slug}` : '',
      });

      return match;
    });

    return content;
  });

  return links;
};

const buildGraphData = (notes, noteIndex, assetIndex) => {
  const referencedHeadingIds = new Set();
  const missingNodes = new Map();
  const links = [];
  const linkKeys = new Set();

  for (const note of notes) {
    note.route = docRoute(note);
    note.source = note.source ?? '';
    note.headings = collectHeadings(note.source);
    note.summary = textSummary(note.source);

    for (const heading of note.headings) {
      heading.id = headingNodeId(note, heading.slug);
      heading.url = `${note.route}#${heading.slug}`;
      heading.parentId = docNodeId(note);
    }
  }

  for (const note of notes) {
    const noteLinks = extractGraphLinks(note, noteIndex, assetIndex, referencedHeadingIds, missingNodes);

    for (const link of noteLinks) {
      addGraphLink(links, linkKeys, link);
    }
  }

  const documentNodes = notes.map((note) => ({
    id: docNodeId(note),
    title: note.sourceRel.toLowerCase() === 'readme.md' ? 'Úvod' : note.title,
    type: 'document',
    group: note.sourceRel.includes('/') ? note.sourceRel.split('/')[0] : 'Kořen',
    folder: path.dirname(note.sourceRel) === '.' ? '' : path.dirname(note.sourceRel),
    url: note.route,
    sourceRel: note.sourceRel,
    generatedRel: note.generatedRel,
    summary: note.summary,
  }));

  const headingNodes = notes.flatMap((note) =>
    note.headings
      .filter((heading) => referencedHeadingIds.has(heading.id))
      .map((heading) => ({
        id: heading.id,
        title: heading.title,
        type: 'heading',
        group: note.sourceRel.includes('/') ? note.sourceRel.split('/')[0] : 'Kořen',
        folder: path.dirname(note.sourceRel) === '.' ? '' : path.dirname(note.sourceRel),
        url: heading.url,
        sourceRel: note.sourceRel,
        parentId: heading.parentId,
        parentTitle: note.title,
        level: heading.level,
      }))
  );

  for (const heading of headingNodes) {
    addGraphLink(links, linkKeys, {
      source: heading.parentId,
      target: heading.id,
      type: 'contains',
      label: 'obsahuje nadpis',
    });
  }

  const nodes = [...documentNodes, ...headingNodes, ...missingNodes.values()];
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, 0]));

  for (const link of links) {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + 1);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + 1);
  }

  for (const node of nodes) {
    node.incoming = incoming.get(node.id) ?? 0;
    node.outgoing = outgoing.get(node.id) ?? 0;
    node.degree = node.incoming + node.outgoing;
  }

  return {
    nodes,
    links,
    stats: {
      documents: documentNodes.length,
      headings: headingNodes.length,
      missing: missingNodes.size,
      links: links.length,
    },
  };
};

const writeGraphData = async (graphData) => {
  await fs.mkdir(path.dirname(graphDataPath), {recursive: true});
  await fs.writeFile(graphDataPath, `${JSON.stringify(graphData, null, 2)}\n`, 'utf8');
};

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

    note.source = await fs.readFile(note.sourceAbs, 'utf8');
    const converted = convertContent(note.source, note, noteIndex, assetIndex);

    await fs.mkdir(path.dirname(path.join(generatedDocsDir, note.generatedRel)), {recursive: true});
    await fs.writeFile(
      path.join(generatedDocsDir, note.generatedRel),
      addFrontMatter(note, converted, nextPosition),
      'utf8',
    );
  }

  await writeGraphData(buildGraphData(notes, noteIndex, assetIndex));

  console.log(`Generated ${notes.length} docs and ${assets.length} assets in ${normalizePath(path.relative(vaultDir, generatedDocsDir))}`);
};

await main();
