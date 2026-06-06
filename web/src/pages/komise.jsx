import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import commissionData from '@site/src/data/commission-data.json';
import styles from './komise.module.css';

const REQUIRED_SUBJECTS = new Set(commissionData.requiredSubjects);

const normalizeText = (value) =>
  String(value ?? '')
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return '0 %';
  if (value >= 10) return `${Math.round(value)} %`;
  return `${value.toFixed(1)} %`;
};

const formatNumber = (value) => Number(value).toLocaleString('cs-CZ', {maximumFractionDigits: 1});

const SCREWED_LABELS = [
  'Podezřele klidné vody',
  'Lehké mrzení',
  'Dá se dýchat',
  'Začíná jít do tuhého',
  'Střední státnicová mlha',
  'Radši zopakovat definice',
  'Tabule bude pracovat přesčas',
  'Tady už se potí fixy',
  'Nouzový režim',
  'Akademický boss fight',
];

const yearWeight = (year) => {
  if (!year) return 0.92;
  if (year >= 2025) return 1.35;
  if (year >= 2023) return 1.18;
  if (year >= 2018) return 1;
  if (year >= 2014) return 0.86;
  return 0.72;
};

const subjectById = new Map(commissionData.subjects.map((subject) => [subject.id, subject]));
const professorByName = new Map(commissionData.professors.map((professor) => [professor.name, professor]));
const optionalSubjectIds = commissionData.subjects
  .map((subject) => subject.id)
  .filter((subjectId) => !REQUIRED_SUBJECTS.has(subjectId));
const optionalSubjectSet = new Set(optionalSubjectIds);
const professorNames = commissionData.professors.map((professor) => professor.name);
const professorNameSet = new Set(professorNames);

const pickKnownValues = (values, validSet, orderedValues) => {
  const selected = new Set(values.filter((value) => validSet.has(value)));
  return orderedValues.filter((value) => selected.has(value));
};

const getRepeatedParams = (params, key) =>
  params
    .getAll(key)
    .map((value) => value.trim())
    .filter(Boolean);

function FilterInput({id, label, value, onChange, placeholder}) {
  return (
    <label className={styles.filterInput} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function OptionList({items, selected, onToggle, emptyText, renderItem}) {
  return (
    <div className={styles.optionList}>
      {items.length > 0 ? (
        items.map((item) => renderItem(item, selected.has(item.id ?? item.name), onToggle))
      ) : (
        <p className={styles.emptySearch}>{emptyText}</p>
      )}
    </div>
  );
}

function useAnalysis(fieldSubjects, selectedProfessors) {
  return useMemo(() => {
    const professorSet = new Set(selectedProfessors);
    const selectedProfessorSubjects = new Map();

    for (const professorName of professorSet) {
      const professor = professorByName.get(professorName);
      for (const item of professor?.subjects ?? []) {
        selectedProfessorSubjects.set(item.subject, (selectedProfessorSubjects.get(item.subject) ?? 0) + item.count);
      }
    }

    const scoreQuestion = (question) => {
      const examinerHit = question.examiner && professorSet.has(question.examiner);
      const committeeHits = question.committee.filter((name) => professorSet.has(name));
      const professorSubjectSupport = selectedProfessorSubjects.get(question.subject) ?? 0;
      let score = 1;

      if (professorSet.size > 0) {
        score = 0.65;
        if (examinerHit) score += 8;
        if (committeeHits.length > 0) score += Math.min(4, committeeHits.length * 1.35);
        score += Math.min(3, professorSubjectSupport * 0.12);
      }

      score *= yearWeight(question.year);

      return {
        ...question,
        score,
        examinerHit,
        committeeHits,
      };
    };

    const buildGroup = (subjects, questionLimit) => {
      const subjectSet = new Set(subjects);
      const scoredQuestions = commissionData.questions
        .filter((question) => subjectSet.has(question.subject))
        .map(scoreQuestion);
      const totalScore = scoredQuestions.reduce((sum, question) => sum + question.score, 0);
      const bySubject = new Map();

      for (const question of scoredQuestions) {
        const current = bySubject.get(question.subject) ?? {
          subject: question.subject,
          score: 0,
          evidence: 0,
          examinerHits: 0,
          committeeHits: 0,
        };

        current.score += question.score;
        current.evidence += 1;
        if (question.examinerHit) current.examinerHits += 1;
        if (question.committeeHits.length > 0) current.committeeHits += 1;
        bySubject.set(question.subject, current);
      }

      const subjectResults = Array.from(bySubject.values())
        .map((item) => ({
          ...item,
          probability: totalScore > 0 ? (item.score / totalScore) * 100 : 0,
        }))
        .sort((a, b) => b.probability - a.probability || b.evidence - a.evidence);

      const questionResults = scoredQuestions
        .map((question) => ({
          ...question,
          probability: totalScore > 0 ? (question.score / totalScore) * 100 : 0,
        }))
        .sort((a, b) => b.score - a.score || b.year - a.year)
        .slice(0, questionLimit);

      return {
        subjects,
        subjectResults,
        questionResults,
        totalEvidence: scoredQuestions.length,
      };
    };

    const common = buildGroup(commissionData.requiredSubjects, 12);
    const field = buildGroup(fieldSubjects, 12);

    return {
      common,
      field,
      totalEvidence: common.totalEvidence + field.totalEvidence,
      professorSet,
    };
  }, [fieldSubjects, selectedProfessors]);
}

function useScrewedMeter(selectedProfessors) {
  return useMemo(() => {
    const members = selectedProfessors
      .map((name) => professorByName.get(name))
      .filter(Boolean)
      .map((professor) => ({
        name: professor.name,
        score: professor.screwed?.score ?? 5,
        confidence: professor.screwed?.confidence ?? 0,
        mentions: professor.screwed?.mentions ?? 0,
        signalCount: professor.screwed?.signalCount ?? 0,
        examinerCount: professor.examinerCount,
        reason: professor.screwed?.reason ?? '',
        method: professor.screwed?.method ?? 'heuristic-fallback',
      }));

    if (!members.length) {
      return {
        level: 1,
        average: 0,
        confidence: 0,
        members,
        label: 'Vyber komisi',
      };
    }

    const weightedSum = members.reduce((sum, member) => {
      const weight = 0.75 + member.confidence;
      return sum + member.score * weight;
    }, 0);
    const totalWeight = members.reduce((sum, member) => sum + 0.75 + member.confidence, 0);
    const average = weightedSum / totalWeight;
    const level = Math.min(10, Math.max(1, Math.round(average)));
    const confidence = members.reduce((sum, member) => sum + member.confidence, 0) / members.length;

    return {
      level,
      average,
      confidence,
      members: [...members].sort((a, b) => b.score - a.score || b.confidence - a.confidence),
      label: SCREWED_LABELS[level - 1],
    };
  }, [selectedProfessors]);
}

function SubjectOption(subject, checked, onToggle) {
  const required = REQUIRED_SUBJECTS.has(subject.id);

  return (
    <label key={subject.id} className={`${styles.optionRow} ${required ? styles.requiredOption : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={required}
        onChange={() => onToggle(subject.id)}
      />
      <span>
        <strong>{subject.id}</strong>
        <small>{subject.label}</small>
      </span>
      <em>{subject.questionCount}</em>
    </label>
  );
}

function ProfessorOption(professor, checked, onToggle) {
  return (
    <label key={professor.name} className={styles.optionRow}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(professor.name)} />
      <span>
        <strong>{professor.name}</strong>
        <small>
          {professor.examinerCount > 0
            ? `${professor.examinerCount}x zkoušející`
            : 'člen komise v zápiscích'}
        </small>
      </span>
      <em>{professor.questionCount}</em>
    </label>
  );
}

function SubjectResult({result}) {
  const subject = subjectById.get(result.subject);

  return (
    <article className={styles.subjectResult}>
      <div>
        <strong>{result.subject}</strong>
        <span>{subject?.label ?? result.subject}</span>
      </div>
      <div className={styles.probabilityBar} aria-label={`Pravděpodobnost ${formatPercent(result.probability)}`}>
        <span style={{width: `${Math.max(3, result.probability)}%`}} />
      </div>
      <dl>
        <div>
          <dt>Odhad</dt>
          <dd>{formatPercent(result.probability)}</dd>
        </div>
        <div>
          <dt>Stopy</dt>
          <dd>{result.evidence}</dd>
        </div>
        <div>
          <dt>Shoda</dt>
          <dd>{result.examinerHits + result.committeeHits}</dd>
        </div>
      </dl>
    </article>
  );
}

function QuestionResult({question}) {
  const subject = subjectById.get(question.subject);

  return (
    <article className={styles.questionCard}>
      <header>
        <div>
          <strong>{question.subject}</strong>
          <span>{subject?.label ?? question.subject}</span>
        </div>
        <mark>{formatPercent(question.probability)}</mark>
      </header>
      <p>{question.question}</p>
      <footer>
        {question.examiner && <span>Zkoušející: {question.examiner}</span>}
        {question.year && <span>{question.year}</span>}
        {question.examinerHit && <b>Přímá shoda</b>}
        {question.committeeHits.length > 0 && <b>V komisi: {question.committeeHits.join(', ')}</b>}
      </footer>
    </article>
  );
}

function SubjectGroup({title, description, emptyText, results}) {
  return (
    <section className={styles.resultSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {results.length > 0 ? (
        <div className={styles.subjectResults}>
          {results.map((result) => (
            <SubjectResult key={result.subject} result={result} />
          ))}
        </div>
      ) : (
        <p className={styles.emptyResult}>{emptyText}</p>
      )}
    </section>
  );
}

function QuestionGroup({title, description, emptyText, questions}) {
  return (
    <section className={styles.resultSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {questions.length > 0 ? (
        <div className={styles.questionResults}>
          {questions.map((question) => (
            <QuestionResult key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <p className={styles.emptyResult}>{emptyText}</p>
      )}
    </section>
  );
}

function ScrewedMeme({level}) {
  const [failed, setFailed] = useState(false);
  const src = useBaseUrl(`/img/komise-screwed/level-${level}.webp`);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div className={styles.memePlaceholder}>
        <strong>level-{level}.webp</strong>
      </div>
    );
  }

  return (
    <img
      className={styles.screwedMeme}
      src={src}
      alt={`How screwed are you level ${level}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function ScrewedMeter({meter}) {
  const scoreText = meter.average > 0 ? formatNumber(meter.average) : '-';
  const confidenceText = `${Math.round(meter.confidence * 100)} %`;

  return (
    <section className={`${styles.resultSection} ${styles.screwedSection}`}>
      <div className={styles.screwedHeader}>
        <div>
          <span>How screwed are you?</span>
          <h2>{meter.label}</h2>
          <p>
            Odhad je odvozený z historických popisů členů komise v podkladech. Je to memometr, ne rozsudek.
          </p>
        </div>
        <div className={styles.screwedScore}>
          <strong>{meter.level}</strong>
          <span>/ 10</span>
        </div>
      </div>

      <div className={styles.screwedBody}>
        <div className={styles.screwedGauge}>
          <div className={styles.screwedTrack}>
            <span style={{width: `${meter.level * 10}%`}} />
          </div>
          <dl>
            <div>
              <dt>Průměr</dt>
              <dd>{scoreText}</dd>
            </div>
            <div>
              <dt>Jistota</dt>
              <dd>{confidenceText}</dd>
            </div>
            <div>
              <dt>Členové</dt>
              <dd>{meter.members.length}</dd>
            </div>
          </dl>
        </div>

        <ScrewedMeme level={meter.level} />
      </div>

      {meter.members.length > 0 ? (
        <div className={styles.screwedMembers}>
          {meter.members.map((member) => (
            <article key={member.name}>
              <strong>{member.name}</strong>
              <span>{member.score}/10</span>
              {member.reason && <small>{member.reason}</small>}
              <small>
                {member.mentions} zmínek, {member.signalCount} signálů
              </small>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptyResult}>Vyber členy komise a memometr začne panikařit za tebe.</p>
      )}
    </section>
  );
}

function CommissionAnalyzer() {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [professorFilter, setProfessorFilter] = useState('');
  const [selectedOptionalSubjects, setSelectedOptionalSubjects] = useState([]);
  const [selectedProfessors, setSelectedProfessors] = useState([]);
  const [urlReady, setUrlReady] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  const selectedSubjects = useMemo(
    () => Array.from(new Set([...commissionData.requiredSubjects, ...selectedOptionalSubjects])),
    [selectedOptionalSubjects],
  );
  const selectedSubjectSet = useMemo(() => new Set(selectedSubjects), [selectedSubjects]);
  const selectedProfessorSet = useMemo(() => new Set(selectedProfessors), [selectedProfessors]);

  const filteredSubjects = useMemo(() => {
    const needle = normalizeText(subjectFilter.trim());
    return commissionData.subjects.filter((subject) => {
      if (!needle) return true;
      return normalizeText(`${subject.id} ${subject.label}`).includes(needle);
    });
  }, [subjectFilter]);

  const filteredProfessors = useMemo(() => {
    const needle = normalizeText(professorFilter.trim());
    return commissionData.professors.filter((professor) => {
      if (!needle) return true;
      return normalizeText(professor.name).includes(needle);
    });
  }, [professorFilter]);

  const analysis = useAnalysis(selectedOptionalSubjects, selectedProfessors);
  const screwedMeter = useScrewedMeter(selectedProfessors);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlProfessors = [...getRepeatedParams(params, 'komise'), ...getRepeatedParams(params, 'clen')];

    setSelectedOptionalSubjects(pickKnownValues(getRepeatedParams(params, 'predmet'), optionalSubjectSet, optionalSubjectIds));
    setSelectedProfessors(pickKnownValues(urlProfessors, professorNameSet, professorNames));
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('predmet');
    url.searchParams.delete('komise');
    url.searchParams.delete('clen');

    for (const subjectId of selectedOptionalSubjects) {
      url.searchParams.append('predmet', subjectId);
    }

    for (const professorName of selectedProfessors) {
      url.searchParams.append('komise', professorName);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [selectedOptionalSubjects, selectedProfessors, urlReady]);

  const toggleSubject = (subjectId) => {
    if (REQUIRED_SUBJECTS.has(subjectId)) return;
    setSelectedOptionalSubjects((current) =>
      current.includes(subjectId)
        ? current.filter((item) => item !== subjectId)
        : [...current, subjectId],
    );
  };

  const toggleProfessor = (professorName) => {
    setSelectedProfessors((current) =>
      current.includes(professorName)
        ? current.filter((item) => item !== professorName)
        : [...current, professorName],
    );
  };

  const clearOptionalSubjects = () => setSelectedOptionalSubjects([]);
  const clearProfessors = () => setSelectedProfessors([]);

  const copyShareLink = async () => {
    if (typeof window === 'undefined') return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('Odkaz zkopírován');
    } catch {
      setShareStatus('Konfigurace je v URL');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.kicker}>MSZZ podle historických zápisků</p>
          <h1>Analyzátor komise</h1>
        </div>
        <div className={styles.headerStats}>
          <span>{commissionData.questions.length} otázek</span>
          <span>{commissionData.subjects.length} předmětů</span>
          <span>{commissionData.professors.length} jmen</span>
        </div>
      </section>

      <section className={styles.notice}>
        <p>
          Odhad vychází jen z materiálu <code>{commissionData.source}</code>. Pokud v seznamu není předmět
          nebo profesor, znamená to, že není v materiálech, ze kterých se čerpá.
        </p>
        <button type="button" onClick={copyShareLink}>
          {shareStatus || 'Kopírovat odkaz'}
        </button>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.controls} aria-label="Výběr komise a předmětů">
          <div className={styles.controlBlock}>
            <div className={styles.blockHeader}>
              <div>
                <h2>Členové komise</h2>
                <p>Vyber libovolný počet jmen.</p>
              </div>
              <button type="button" onClick={clearProfessors} disabled={selectedProfessors.length === 0}>
                Vyčistit
              </button>
            </div>
            <FilterInput
              id="professor-filter"
              label="Hledat profesora"
              value={professorFilter}
              onChange={setProfessorFilter}
              placeholder="Např. Demlová, Čmolík..."
            />
            <OptionList
              items={filteredProfessors}
              selected={selectedProfessorSet}
              onToggle={toggleProfessor}
              emptyText="Tohle jméno v podkladech není."
              renderItem={ProfessorOption}
            />
          </div>

          <div className={styles.controlBlock}>
            <div className={styles.blockHeader}>
              <div>
                <h2>Předměty</h2>
                <p>TAL, PAL a KO jsou povinné.</p>
              </div>
              <button type="button" onClick={clearOptionalSubjects} disabled={selectedOptionalSubjects.length === 0}>
                Jen povinné
              </button>
            </div>
            <FilterInput
              id="subject-filter"
              label="Hledat předmět"
              value={subjectFilter}
              onChange={setSubjectFilter}
              placeholder="Např. ZKS, VIZ, architektury..."
            />
            <OptionList
              items={filteredSubjects}
              selected={selectedSubjectSet}
              onToggle={toggleSubject}
              emptyText="Tenhle předmět v podkladech není."
              renderItem={SubjectOption}
            />
          </div>
        </aside>

        <section className={styles.results} aria-label="Analýza pravděpodobnosti">
          <div className={styles.summaryGrid}>
            <div>
              <span>Vybraná komise</span>
              <strong>{selectedProfessors.length}</strong>
            </div>
            <div>
              <span>Společná otázka</span>
              <strong>{commissionData.requiredSubjects.length}</strong>
            </div>
            <div>
              <span>Oborové předměty</span>
              <strong>{selectedOptionalSubjects.length}</strong>
            </div>
            <div>
              <span>Stopy v datech</span>
              <strong>{analysis.totalEvidence}</strong>
            </div>
          </div>

          <ScrewedMeter meter={screwedMeter} />

          <SubjectGroup
            title="Společná otázka: TAL / PAL / KO"
            description="V této části je součet pravděpodobností vždy 100 %, protože si vytáhneš právě jednu otázku z TAL, PAL nebo KO."
            emptyText="Pro povinné předměty nejsou v podkladech žádné otázky."
            results={analysis.common.subjectResults}
          />

          <SubjectGroup
            title="Oborová otázka: vybrané předměty"
            description="Druhá otázka se normalizuje jen mezi oborovými předměty, které si zaškrtneš."
            emptyText="Zaškrtni aspoň jeden oborový předmět, aby šlo odhadnout druhou otázku."
            results={analysis.field.subjectResults}
          />

          <QuestionGroup
            title="Nejpravděpodobnější společné otázky"
            description="Procenta jsou relativní podíl pouze v rámci společné skupiny TAL/PAL/KO."
            emptyText="Pro společnou skupinu nejsou v podkladech žádné otázky."
            questions={analysis.common.questionResults}
          />

          <QuestionGroup
            title="Nejpravděpodobnější oborové otázky"
            description="Procenta jsou relativní podíl pouze v rámci vybraných oborových předmětů."
            emptyText="Vyber oborové předměty, potom se tady ukážou kandidátní otázky."
            questions={analysis.field.questionResults}
          />
        </section>
      </section>
    </main>
  );
}

export default function CommissionPage() {
  return (
    <Layout title="Analyzátor komise" description="Analýza pravděpodobných státnicových předmětů a otázek podle komise">
      <CommissionAnalyzer />
    </Layout>
  );
}
