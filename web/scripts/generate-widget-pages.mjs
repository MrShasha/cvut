import fs from 'node:fs/promises';
import path from 'node:path';

const webDir = path.resolve(import.meta.dirname, '..');
const vaultDir = path.resolve(webDir, '..');
const OUTPUT_FILENAME = 'Všechny widgety.md';

const EXCLUDED_TOP_DIRS = new Set(['.git', '.github', '.obsidian', '.idea', 'web', 'node_modules']);

const normalizePath = (v) => v.split(path.sep).join('/');

const walk = async (dir, shouldSkipDir = () => false) => {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(full, entry.name)) files.push(...(await walk(full, shouldSkipDir)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
};

const extractWidgetBlocks = (content) => {
  const blocks = [];
  const re = /(<iframe[\s\S]*?<\/iframe>)(\s*<div class="widget-open-link">[\s\S]*?<\/div>)?/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const srcM = m[1].match(/src=["']([^"']+)["']/i);
    if (!srcM) continue;
    const html = m[2] ? m[1] + '\n' + m[2].trimStart() : m[1];
    blocks.push({html, src: srcM[1], index: m.index});
  }
  return blocks;
};

const nearestHeading = (content, beforeIndex) => {
  const lines = content.slice(0, beforeIndex).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].trimEnd().match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
    if (m) return {level: m[1].length, text: m[2].trim()};
  }
  return null;
};

const main = async () => {
  const allFiles = await walk(vaultDir, (full, name) => {
    const rel = path.relative(vaultDir, full);
    return !rel.includes(path.sep) && EXCLUDED_TOP_DIRS.has(name);
  });

  const mdFiles = allFiles.filter(
    (f) => path.extname(f).toLowerCase() === '.md' && path.basename(f) !== OUTPUT_FILENAME,
  );

  // courseDir (absolute path) -> [{ noteTitle, heading, html, src }]
  const widgetsByCourse = new Map();

  for (const filePath of mdFiles) {
    const noteTitle = path.basename(filePath, '.md');
    const courseDir = path.dirname(filePath);
    const relCourse = normalizePath(path.relative(vaultDir, courseDir));

    if (!relCourse.includes('/')) continue;

    const content = await fs.readFile(filePath, 'utf8');
    const blocks = extractWidgetBlocks(content);
    if (blocks.length === 0) continue;

    if (!widgetsByCourse.has(courseDir)) widgetsByCourse.set(courseDir, []);

    for (const block of blocks) {
      const heading = nearestHeading(content, block.index);
      widgetsByCourse.get(courseDir).push({noteTitle, heading, html: block.html, src: block.src});
    }
  }

  let count = 0;
  let linkedCount = 0;

  for (const [courseDir, widgets] of widgetsByCourse) {
    const outputPath = path.join(courseDir, OUTPUT_FILENAME);

    const lines = ['# Všechny widgety', ''];

    const byNote = new Map();
    for (const w of widgets) {
      if (!byNote.has(w.noteTitle)) byNote.set(w.noteTitle, []);
      byNote.get(w.noteTitle).push(w);
    }

    for (const [noteTitle, noteWidgets] of byNote) {
      lines.push(`## [[${noteTitle}]]`, '');

      for (const w of noteWidgets) {
        if (w.heading) {
          lines.push(`*Sekce: [[${noteTitle}#${w.heading.text}|${w.heading.text}]]*`, '');
        }
        lines.push(w.html, '');
      }

      lines.push('---', '');
    }

    await fs.writeFile(outputPath, lines.join('\n'), 'utf8');
    console.log(`Generated: ${normalizePath(path.relative(vaultDir, outputPath))}`);
    count++;

    // Link from the obsah page
    const courseDirEntries = await fs.readdir(courseDir);
    const obsahName = courseDirEntries.find((name) =>
      /^0\. obsah/i.test(name) && name.toLowerCase().endsWith('.md'),
    );

    if (obsahName) {
      const obsahPath = path.join(courseDir, obsahName);
      const obsahContent = await fs.readFile(obsahPath, 'utf8');

      if (!obsahContent.includes('[[Všechny widgety]]')) {
        const trimmed = obsahContent.trimEnd();
        const separator = trimmed.endsWith('---') ? '' : '\n\n---';
        await fs.writeFile(obsahPath, `${trimmed}${separator}\n[[Všechny widgety]]\n`, 'utf8');
        console.log(`  Linked: ${normalizePath(path.relative(vaultDir, obsahPath))}`);
        linkedCount++;
      }
    }
  }

  console.log(`\nGenerated ${count} widget pages, linked ${linkedCount} obsah pages.`);
};

await main();
