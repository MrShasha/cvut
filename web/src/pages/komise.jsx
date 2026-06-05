import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
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

function useAnalysis(selectedSubjects, selectedProfessors) {
  return useMemo(() => {
    const subjectSet = new Set(selectedSubjects);
    const professorSet = new Set(selectedProfessors);
    const selectedProfessorSubjects = new Map();

    for (const professorName of professorSet) {
      const professor = professorByName.get(professorName);
      for (const item of professor?.subjects ?? []) {
        selectedProfessorSubjects.set(item.subject, (selectedProfessorSubjects.get(item.subject) ?? 0) + item.count);
      }
    }

    const scoredQuestions = commissionData.questions
      .filter((question) => subjectSet.has(question.subject))
      .map((question) => {
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
      });

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
      .slice(0, 18);

    return {
      subjectResults,
      questionResults,
      totalEvidence: scoredQuestions.length,
      professorSet,
    };
  }, [selectedProfessors, selectedSubjects]);
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

function CommissionAnalyzer() {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [professorFilter, setProfessorFilter] = useState('');
  const [selectedOptionalSubjects, setSelectedOptionalSubjects] = useState([]);
  const [selectedProfessors, setSelectedProfessors] = useState([]);

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

  const analysis = useAnalysis(selectedSubjects, selectedProfessors);

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
        <strong>Ber to jako vodítko, ne věštírnu.</strong>
        <span>
          Odhad vychází jen z materiálu <code>{commissionData.source}</code>. Pokud v seznamu není předmět
          nebo profesor, znamená to, že není v materiálech, ze kterých se čerpá.
        </span>
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
              <span>Vybrané předměty</span>
              <strong>{selectedSubjects.length}</strong>
            </div>
            <div>
              <span>Relevantní otázky</span>
              <strong>{analysis.totalEvidence}</strong>
            </div>
          </div>

          <section className={styles.resultSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Pravděpodobnost předmětů</h2>
                <p>
                  Skóre posilují přímé shody se zkoušejícím, výskyt člena v komisi a novější záznamy.
                </p>
              </div>
            </div>
            <div className={styles.subjectResults}>
              {analysis.subjectResults.map((result) => (
                <SubjectResult key={result.subject} result={result} />
              ))}
            </div>
          </section>

          <section className={styles.resultSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Nejpravděpodobnější otázky</h2>
                <p>
                  Procenta jsou relativní podíl v rámci vybraných předmětů a komise, ne skutečná četnost losování.
                </p>
              </div>
            </div>
            <div className={styles.questionResults}>
              {analysis.questionResults.map((question) => (
                <QuestionResult key={question.id} question={question} />
              ))}
            </div>
          </section>
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
