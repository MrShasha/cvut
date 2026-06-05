import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const sourcePath = process.env.COMMISSION_SOURCE
  ? path.resolve(process.env.COMMISSION_SOURCE)
  : path.resolve(webRoot, '..', '..', 'statnice_komise.md');
const outputPath = path.resolve(webRoot, 'src', 'data', 'commission-data.json');

const SUBJECT_LABELS = {
  APG: 'Algoritmy počítačové grafiky',
  AVS: 'Architektury výpočetních systémů',
  BSY: 'Bezpečnost systémů',
  BUK: 'Business a uživatelská komunikace',
  DS2: 'Databáze 2',
  ESW: 'Efektivní software',
  GVG: 'Geometrie ve virtuálním prostoru',
  HCI: 'Human-Computer Interaction',
  ISC: 'Informační systémy a cloud',
  KO: 'Kombinatorická optimalizace',
  KRP: 'Kryptografie',
  MMA: 'Multimédia a animace',
  NUR: 'Návrh uživatelských rozhraní',
  OSP: 'Operační systémy a programování',
  OSW: 'Ontologie a sémantický web',
  PAG: 'Paralelní algoritmy',
  PAL: 'Pokročilá algoritmizace',
  PAP: 'Pokročilé architektury počítačů',
  PI: 'Projektové inženýrství',
  PII: 'Pokročilé informační infrastruktury',
  PUR: 'Psychologie uživatele a research',
  SAN: 'Statistická analýza',
  SI: 'Softwarové inženýrství',
  SWA: 'Softwarové architektury',
  TAL: 'Teorie algoritmů',
  TPJ: 'Techniky programovacích jazyků',
  TVS: 'Tvorba vestavných systémů',
  UI: 'Umělá inteligence',
  UIR: 'Umělá inteligence a robotika',
  VIZ: 'Vizualizace',
  ZKS: 'Zajištění kvality softwaru',
};

const REQUIRED_SUBJECTS = new Set(['TAL', 'PAL', 'KO']);
const TITLE_WORDS = /\b(doc|prof|ing|rndr|mgr|msc|phd|ph\.d|csc|dr|bc|phdr)\.?\b/ig;
const REJECT_NAMES = new Set([
  'A/A',
  'IBM',
  'Cisco',
  'PhD',
  'CSc',
  'MSc',
  'Ph',
  'Sc',
  'ČR',
  'ČZU',
  'Brno',
  'Plzne',
  'FIT',
  'UTIA',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
]);
const NAME_ALIASES = new Map([
  ['berezovskyj', 'Berezovskyj'],
  ['genykberezovskyj', 'Berezovskyj'],
  ['bures', 'Bureš'],
  ['hanzalek', 'Hanzálek'],
  ['krivanek', 'Křivánek'],
  ['klima', 'Klíma'],
  ['marik', 'Mařík'],
  ['matousek', 'Matoušek'],
  ['mrazova', 'Mrázová'],
  ['muller', 'Müller'],
  ['pisa', 'Píša'],
  ['sedlacek', 'Sedláček'],
  ['sykora', 'Sýkora'],
  ['vyskocil', 'Vyskočil'],
  ['vzskocil', 'Vyskočil'],
  ['zara', 'Žára'],
  ['zukovec', 'Žukovec'],
]);

const stripDiacritics = (value) =>
  value
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}]+/gu, '');

const canonicalName = (name) => {
  const key = stripDiacritics(name);
  return NAME_ALIASES.get(key) ?? name;
};

const normalizeName = (value) => {
  let text = String(value ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:externista|predseda|mistopredseda|předseda|místopředseda|nepritomny|nepřítomný)\b/ig, ' ')
    .replace(TITLE_WORDS, ' ')
    .replace(/[;:,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  const parts = text
    .split(' ')
    .map((part) => part.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter((part) => part.length > 1 && !REJECT_NAMES.has(part));

  if (!parts.length) return '';

  const name = parts.length >= 2 && parts.every((part) => part === part.toLocaleUpperCase('cs'))
    ? parts[0]
    : parts[parts.length - 1];

  if (name === name.toLocaleUpperCase('cs') && name.length <= 4) return '';
  if (!/^\p{Lu}/u.test(name)) return '';

  return canonicalName(name);
};

const splitPeople = (value) =>
  Array.from(
    new Set(
      String(value ?? '')
        .split(/[,;]|\s+-\s+|\s+a\s+/u)
        .map(normalizeName)
        .filter(Boolean),
    ),
  );

const extractYear = (value) => {
  const match = String(value ?? '').match(/\b(20\d{2}|19\d{2})\b/u);
  return match ? Number(match[1]) : null;
};

const splitQuestionSegments = (line) =>
  line
    .split(/(?=(?:Spole\S*|Obor\S*)\s+)/u)
    .map((segment) => segment.trim())
    .filter(Boolean);

const trimCommitteeBody = (value) =>
  String(value ?? '')
    .split(/\s+(?:Spole\S*|Obor\S*|Obhajoba|Diplomka|DP:|Zkoušení|Zkouseni|Celkov)/u)[0]
    .trim();

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Commission source not found: ${sourcePath}`);
}

const lines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
let currentRecord = {date: '', year: null, committee: []};
const questions = [];

const pushQuestion = ({line, subject, examiner, question, type}) => {
  const cleanQuestion = String(question ?? '').replace(/\s+/g, ' ').trim();

  if (!/^[A-Z0-9]{2,6}$/.test(subject) || cleanQuestion.length < 5) return;

  questions.push({
    id: `q${questions.length + 1}`,
    line,
    date: currentRecord.date,
    year: currentRecord.year,
    subject,
    examiner: normalizeName(examiner),
    committee: currentRecord.committee,
    question: cleanQuestion.slice(0, 560),
    sourceType: type,
  });
};

for (let index = 0; index < lines.length; index += 1) {
  const raw = lines[index].trim();
  if (!raw) continue;

  const startsRecord = raw.startsWith('[MSZZ]') || /^\s*\d{1,2}[./]\s*\d{1,2}[./]\s*\d{2,4}\b/u.test(raw);

  if (startsRecord) {
    currentRecord = {
      date: raw.slice(0, 140),
      year: extractYear(raw),
      committee: [],
    };

    const dateCommittee = raw.match(/^\s*\d{1,2}[./]\s*\d{1,2}[./]\s*\d{2,4}\s*[-–]\s*(.+)$/u);
    if (dateCommittee && /[;,]|\b(?:doc|prof|Ing|Mgr|RNDr)\b/u.test(dateCommittee[1])) {
      const people = splitPeople(trimCommitteeBody(dateCommittee[1]));
      if (people.length >= 2) currentRecord.committee = people;
    }
  }

  const committeeMatch = raw.match(/Komise\s*[:\-–]\s*(.*)$/u);
  if (committeeMatch) {
    let body = trimCommitteeBody(committeeMatch[1]);

    if (!body) {
      const chunks = [];
      for (let offset = index + 1; offset < Math.min(lines.length, index + 8); offset += 1) {
        const next = lines[offset].trim();
        if (!next || /^(Obhajoba|\[|Spole|Obor)/u.test(next)) break;
        chunks.push(next);
      }
      body = chunks.join(', ');
    }

    const people = splitPeople(body);
    if (people.length >= 2) {
      currentRecord = {...currentRecord, committee: people};
    }
  }

  const directQuestion = raw.match(/^\[([A-Z0-9]{2,5})\]\s+([^:]{1,80}):\s*(.+)$/u);
  if (directQuestion && !['MSZZ', 'INFO'].includes(directQuestion[1])) {
    pushQuestion({
      line: index + 1,
      subject: directQuestion[1],
      examiner: directQuestion[2],
      question: directQuestion[3],
      type: 'direct',
    });
  }

  for (const segment of splitQuestionSegments(raw)) {
    if (!/^(Spole|Obor)/u.test(segment)) continue;

    const bracketParts = Array.from(segment.matchAll(/\[([^\]]+)\]/g), (match) => match[1].trim());
    const subjects = bracketParts.filter((part) => /^[A-Z0-9]{2,6}$/.test(part));
    const examiner = bracketParts.find((part) => !/^[A-Z0-9]{2,6}$/.test(part) && part !== '?') ?? '';
    const lastBracket = segment.lastIndexOf(']');
    const question =
      lastBracket >= 0
        ? segment.slice(lastBracket + 1).replace(/^\s*[-–:]\s*/, '').trim()
        : '';

    for (const subject of subjects) {
      pushQuestion({
        line: index + 1,
        subject,
        examiner,
        question,
        type: 'template',
      });
    }
  }
}

const subjectIds = Array.from(new Set(questions.map((question) => question.subject))).sort();
const professorNames = Array.from(
  new Set(
    questions
      .flatMap((question) => [question.examiner, ...question.committee])
      .filter(Boolean),
  ),
).sort((a, b) => a.localeCompare(b, 'cs'));

const subjects = subjectIds.map((id) => ({
  id,
  label: SUBJECT_LABELS[id] ?? id,
  required: REQUIRED_SUBJECTS.has(id),
  questionCount: questions.filter((question) => question.subject === id).length,
}));

const professors = professorNames.map((name) => {
  const relatedQuestions = questions.filter(
    (question) => question.examiner === name || question.committee.includes(name),
  );
  const subjectCounts = relatedQuestions.reduce((counts, question) => {
    counts[question.subject] = (counts[question.subject] ?? 0) + 1;
    return counts;
  }, {});

  return {
    name,
    questionCount: relatedQuestions.length,
    examinerCount: questions.filter((question) => question.examiner === name).length,
    subjects: Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'))
      .map(([subject, count]) => ({subject, count})),
  };
});

const data = {
  source: path.basename(sourcePath),
  requiredSubjects: Array.from(REQUIRED_SUBJECTS),
  subjects,
  professors,
  questions,
};

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(`Wrote ${questions.length} questions, ${subjects.length} subjects, ${professors.length} professors to ${outputPath}`);
