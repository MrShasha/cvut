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

const SCORE_KEYWORDS = [
  [/v pohod[eě]|v klidu|pohodov|hodn[ýáei]|mil[ýá]|příjemn|prijemn|fajn|pom[aá]h|nav[aá]d|podrž|podrzel|usm[ií]v|nesnažil.*potopit|nesnazil.*potopit|nepotop[ií]|stačilo|stacilo|rozumn[ýey]|bez probl[eé]m|super|skv[eě]l/giu, -1.55],
  [/přísn|prisn|nepříjemn|neprijemn|dusil|topil|potopit|z[aá]keř|zakern|rozsekal|zaskocil|r[ýy]pal|rejpal|cht[eě]l.*přesn|chtel.*presn|do hloubky|vyt[áa]hl|vykoup[aá]n|h[aá]dal|nemile prekvapil|nemile překvapil|nezd[aá]lo|nebylo.*příjemn|nebylo.*prijemn/giu, 1.35],
  [/za F|vyhozen|nedat|zabil|zabít|masakr|nejhorš|nejhorsi|tvrd[ýy]|rozdrtil|rozesral|předem rozhodnutej|predem rozhodnutej/giu, 2.25],
];

const CURATED_SCREWED_PROFILES = new Map(Object.entries({
  berezovskyj: {
    score: 7,
    confidence: 0.92,
    reason: 'Opakovaně vyžaduje formální definice a umí skákat do řeči; v zápiscích ale není popsaný jako někdo, kdo by cíleně topil.',
  },
  berka: {
    score: 4,
    confidence: 0.85,
    reason: 'Ptá se na praktické doplňky a občas chce konkrétní detaily, ale většina záznamů ho popisuje jako v pohodě a hodnotícího rozumně.',
  },
  blasko: {
    score: 7,
    confidence: 0.78,
    reason: 'Umí být dost přísný na význam slov a přesné formulace; u TAL umí zastavit, když slyší dost, ale tlak na definice je znatelný.',
  },
  bittner: {
    score: 5,
    confidence: 0.55,
    reason: 'V materiálu je málo přímého zkoušení; zmínky působí spíše neutrálně, proto zůstává u středního rizika.',
  },
  buk: {
    score: 6,
    confidence: 0.48,
    reason: 'Skóre táhne hlavně obtížnost souvisejících témat, ne jasně negativní chování v komisi.',
  },
  bures: {
    score: 5,
    confidence: 0.88,
    reason: 'Chce formálnější definice a praktické detaily, ale zápisky opakovaně říkají, že otázky nebyly zákeřné a hodnocení působilo mírně.',
  },
  cmolik: {
    score: 7,
    confidence: 0.95,
    reason: 'Často pokračuje otevřenými dotazy a chce slyšet konkrétní interpretace i samozřejmé detaily; někdy je ale schopný otázku rychle uzavřít.',
  },
  demlova: {
    score: 2,
    confidence: 1,
    reason: 'Napříč záznamy působí jako velmi podporující: pomáhá, opravuje bez potápění a zvedá náladu komise.',
  },
  faigl: {
    score: 6,
    confidence: 0.82,
    reason: 'Když se odbočí od jádra otázky, zastaví to a chce formální vlastnosti; nejde však o zákeřné zkoušení.',
  },
  filip: {
    score: 6,
    confidence: 0.5,
    reason: 'Materiál dává málo přímých signálů; riziko je spíše z náročnosti témat než z popisu konkrétního přístupu.',
  },
  hanzalek: {
    score: 3,
    confidence: 0.95,
    reason: 'Záznamy ho opakovaně popisují jako hodného a návodného; umí chtít přesnost, ale spíš se snaží dostat ze studenta použitelnou odpověď.',
  },
  havran: {
    score: 10,
    confidence: 0.95,
    reason: 'Nejsilnější negativní profil v materiálu: detailní záznam popisuje tvrdé topení, rozsekání diplomky a dojem předem rozhodnutého verdiktu.',
  },
  hekrdla: {
    score: 2,
    confidence: 0.75,
    reason: 'Přímých zmínek je míň, ale dostupné popisy jsou podporující: úsměv, pomoc a žádná snaha potopit.',
  },
  habala: {
    score: 5,
    confidence: 0.42,
    reason: 'V materiálu se objevuje často jako člen komise, ale bez výrazného přímého zkoušení; proto zůstává neutrální profil.',
  },
  herout: {
    score: 3,
    confidence: 0.72,
    reason: 'Vystupuje hlavně u drobných nebo věcných dotazů; materiál neukazuje výrazně rizikové zkoušení.',
  },
  horcik: {
    score: 5,
    confidence: 0.42,
    reason: 'Je častěji uvedený v komisi než popsaný jako zkoušející, takže z podkladů nevychází jasný směr rizika.',
  },
  jakob: {
    score: 2,
    confidence: 0.72,
    reason: 'Zmíněný jako hodný a nápomocný, bez negativních signálů v dostupných záznamech.',
  },
  jelinek: {
    score: 5,
    confidence: 0.42,
    reason: 'Objevuje se hlavně jako předseda bez výrazných popisů zkoušení, takže profil drží neutrální riziko.',
  },
  klima: {
    score: 3,
    confidence: 0.9,
    reason: 'Opakovaně pohodový a podporující profil; ptá se k věci a podle zápisků umí podržet.',
  },
  klema: {
    score: 3,
    confidence: 0.92,
    reason: 'Umí se doptávat na statistické detaily, ale záznamy ho popisují jako návodného, přátelského a férového.',
  },
  kouba: {
    score: 2,
    confidence: 0.78,
    reason: 'Dostupné zmínky jsou jednoznačně klidné: naprosto v pohodě, žádné zákeřné dotazy.',
  },
  kratky: {
    score: 7,
    confidence: 0.86,
    reason: 'Umí jít do hloubky a chytit se vedlejších detailů; některé záznamy jsou pohodové, ale riziko vykoupání je reálné.',
  },
  lisy: {
    score: 3,
    confidence: 0.78,
    reason: 'U B-stromů stačily obecné vlastnosti a když student něco nevěděl, dál se v tom nešťoural; u DP spíš věcné drobné dotazy.',
  },
  kohout: {
    score: 4,
    confidence: 0.58,
    reason: 'Má pár zvláštnějších dotazů k diplomce, ale dostupné popisy ho drží spíš v klidné a rozumné části spektra.',
  },
  kubr: {
    score: 5,
    confidence: 0.7,
    reason: 'Zkouší základní grafová témata, ale umí chtít přesnější složitosti a detaily, takže nejde o úplně bezpracnou variantu.',
  },
  macek: {
    score: 4,
    confidence: 0.55,
    reason: 'V materiálu je spíše jako přítomný člen komise než jako výrazný zkoušející, proto zůstává mírně pod středem.',
  },
  macik: {
    score: 3,
    confidence: 0.9,
    reason: 'Při HCI/NUR působí příjemně, signalizuje spokojenost a když je potřeba, pomůže studentovi se opravit.',
  },
  maly: {
    score: 3,
    confidence: 0.82,
    reason: 'Zápisky ho popisují jako velmi příjemného a věcného; doptává se hlavně na použití v praxi a přikyvuje, když odpověď sedí.',
  },
  marecek: {
    score: 5,
    confidence: 0.55,
    reason: 'Málo přímého kontextu; z dostupných zmínek nevychází ani výrazně podpůrný, ani výrazně rizikový profil.',
  },
  marik: {
    score: 3,
    confidence: 0.88,
    reason: 'Má víc dotazů a může působit přísněji u obhajoby, ale u zkoušení často stačí věcné odpovědi a umí otázku rychle ukončit.',
  },
  matas: {
    score: 9,
    confidence: 0.9,
    reason: 'Silně náročný profil: chce přesné definice, ignoruje obecné vyprávění a dokáže studenta nepříjemně rozebrat na detailech.',
  },
  mikovec: {
    score: 4,
    confidence: 0.72,
    reason: 'Objevuje se často v komisích, ale bez silných negativních signálů; působí spíše neutrálně až mírně klidně.',
  },
  mrazova: {
    score: 4,
    confidence: 0.72,
    reason: 'Umí se déle zastavit u detailů a vlastních oblíbených témat, ale popis je zároveň velmi milý, přátelský a navádějící.',
  },
  paces: {
    score: 2,
    confidence: 0.72,
    reason: 'Jako předseda je popisovaný velmi pozitivně: usměvavý, klidný a bez zásahů, které by studenta zbytečně potápěly.',
  },
  pisa: {
    score: 3,
    confidence: 0.82,
    reason: 'Záznamy ho popisují jako v pohodě a věcného, často s praktickými technickými dotazy.',
  },
  rogalewicz: {
    score: 7,
    confidence: 0.78,
    reason: 'Dostupné popisy naznačují rýpavější, méně příjemný styl a tlak na přesné formulace.',
  },
  rollo: {
    score: 4,
    confidence: 0.62,
    reason: 'V dostupném kontextu se doptává ze zajímavosti a bez rýpání; přímého zkoušení je ale málo, proto zůstává lehce opatrné skóre.',
  },
  slavik: {
    score: 8,
    confidence: 0.88,
    reason: 'V materiálech se opakovaně objevuje jako rýpavý a konfliktnější; umí se přít o formulace a způsob zápisu.',
  },
  sloup: {
    score: 3,
    confidence: 0.6,
    reason: 'Dostupný zápis ho řadí do hodné komise, která se v neznalostech zbytečně nešťourala.',
  },
  sojka: {
    score: 6,
    confidence: 0.78,
    reason: 'Ptá se technicky a umí jít až na nízkou úroveň detailu, ale záznamy nejsou vyloženě potápěcí.',
  },
  sochor: {
    score: 5,
    confidence: 0.4,
    reason: 'V materiálech je málo přímého kontextu a někdy ani nebylo jasné, zda byl přítomen, proto zůstává neutrální profil.',
  },
  sporka: {
    score: 3,
    confidence: 0.78,
    reason: 'Působí mile a udržuje kontakt; u zkoušení se ptá na základy bez chytáků, spíš věcně než potápěcí.',
  },
  strnad: {
    score: 5,
    confidence: 0.55,
    reason: 'Zkouší náročnější TPJ témata, ale zápisky nedávají dost signálů pro výrazně hodné ani výrazně drsné hodnocení.',
  },
  sykora: {
    score: 3,
    confidence: 0.62,
    reason: 'V dostupných zápiscích spíš mlčí nebo má konstruktivní dotazy; u oborové otázky není popsaný jako zákeřný.',
  },
  susta: {
    score: 7,
    confidence: 0.74,
    reason: 'Jeden záznam popisuje, že studentovi nestačil základ, působil naštvaně a otázky byly těžko čitelné; jiný průchod byl klidnější.',
  },
  sedlacek: {
    score: 5,
    confidence: 0.72,
    reason: 'Umí trochu rýpnout a u technických otázek chce konkrétní principy, ale celkový popis zůstává spíš věcný a bez dramatu.',
  },
  sucha: {
    score: 5,
    confidence: 0.92,
    reason: 'Chce přesné formulace, proměnné a detaily algoritmu, ale často je věcný, férový a když slyší dost, zkoušení ukončí.',
  },
  tiser: {
    score: 5,
    confidence: 0.78,
    reason: 'Typicky se drží TAL formalit a redukcí; chce přesnost a konkrétní převod, ale zápisky neukazují snahu studenta dusit.',
  },
  velebil: {
    score: 6,
    confidence: 0.82,
    reason: 'Dokáže studenta vykoupat ve formálnějších oblastech, zároveň ale vede k tomu, co chce slyšet.',
  },
  werner: {
    score: 2,
    confidence: 0.78,
    reason: 'U ILP byl popsaný jako naprosto super, snažil se pomoct a když viděl, že se student nechytá, otázku ukončil.',
  },
  vokrinek: {
    score: 5,
    confidence: 0.72,
    reason: 'Profil je smíšený a spíše neutrální; objevuje se u věcných dotazů bez jasného vzorce potápění.',
  },
  vyskocil: {
    score: 8,
    confidence: 0.96,
    reason: 'Opakovaně se objevuje jako člověk, který ryje do diplomky i odpovědi a umí zaskočit; pár záznamů je mírnějších, ale celkový signál je rizikový.',
  },
  zara: {
    score: 7,
    confidence: 0.82,
    reason: 'Materiál je rozporuplný: někdy hodný a milý, jindy silně kritický k prezentaci a obhajobě. Proto vyšší, ale ne maximální riziko.',
  },
  zelezny: {
    score: 3,
    confidence: 0.82,
    reason: 'Popisovaný jako milý, nápomocný a tolerantní k chybám, s věcnými dotazy k prezentaci.',
  },
  zukovec: {
    score: 6,
    confidence: 0.95,
    reason: 'Častá zkoušející TAL: většinou férově kývá a nechává mluvit, ale přesně najde mezery v definicích a umí se na nich chvíli držet.',
  },
}));

const fallbackScrewedReason = (score, mentions) => {
  if (mentions === 0) {
    return 'V materiálech není dost přímého kontextu, tak je použité neutrální fallback skóre.';
  }

  if (score >= 8) return 'Automatický odhad našel víc rizikových signálů, ale bez ručně ověřeného profilu.';
  if (score >= 6) return 'Automatický odhad našel smíšené nebo mírně rizikové signály.';
  if (score <= 3) return 'Automatický odhad našel převážně uklidňující signály.';
  return 'V materiálech je jen několik nejednoznačných stop, proto zůstává skóre poblíž středu.';
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const countKeywordWeight = (text) =>
  SCORE_KEYWORDS.reduce((sum, [pattern, weight]) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length * weight : 0);
  }, 0);

const buildScrewedProfile = (name, professorQuestions, examinerCount) => {
  const nameKey = stripDiacritics(name);
  const sourceContexts = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!stripDiacritics(lines[index]).includes(nameKey)) continue;

    sourceContexts.push(
      [
        lines[index - 1] ?? '',
        lines[index],
        lines[index + 1] ?? '',
      ].join(' '),
    );
  }

  const text = sourceContexts.join(' ');
  const signalWeight = countKeywordWeight(text);
  const signalCount = SCORE_KEYWORDS.reduce((sum, [pattern]) => sum + (text.match(pattern)?.length ?? 0), 0);
  const activityWeight = Math.min(0.6, examinerCount * 0.06 + professorQuestions.length * 0.006);
  const confidence = Math.min(1, (sourceContexts.length + signalCount) / 10);
  const normalizedSignal = signalWeight / Math.max(1.15, Math.sqrt(signalCount + sourceContexts.length + 1) * 0.62);
  const rawScore = 5 + normalizedSignal + activityWeight;

  return {
    rawScore: Number(rawScore.toFixed(3)),
    score: clamp(Math.round(rawScore), 1, 10),
    confidence: Number(confidence.toFixed(2)),
    mentions: sourceContexts.length,
    signalCount,
  };
};

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

let professors = professorNames.map((name) => {
  const relatedQuestions = questions.filter(
    (question) => question.examiner === name || question.committee.includes(name),
  );
  const examinerCount = questions.filter((question) => question.examiner === name).length;
  const subjectCounts = relatedQuestions.reduce((counts, question) => {
    counts[question.subject] = (counts[question.subject] ?? 0) + 1;
    return counts;
  }, {});

  return {
    name,
    questionCount: relatedQuestions.length,
    examinerCount,
    screwed: buildScrewedProfile(name, relatedQuestions, examinerCount),
    subjects: Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'))
      .map(([subject, count]) => ({subject, count})),
  };
});

professors = professors.map((professor) => {
  const {rawScore, ...screwed} = professor.screwed;
  const curatedProfile = CURATED_SCREWED_PROFILES.get(stripDiacritics(professor.name));

  if (curatedProfile) {
    return {
      ...professor,
      screwed: {
        ...screwed,
        score: curatedProfile.score,
        confidence: Math.max(screwed.confidence, curatedProfile.confidence),
        reason: curatedProfile.reason,
        method: 'context-profile',
      },
    };
  }

  const confidenceWeight = 0.55 + screwed.confidence * 0.45;
  const score = clamp(Math.round(5 + (rawScore - 5) * confidenceWeight * 2.25), 1, 10);

  return {
    ...professor,
    screwed: {
      ...screwed,
      score,
      reason: fallbackScrewedReason(score, screwed.mentions),
      method: 'heuristic-fallback',
    },
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
