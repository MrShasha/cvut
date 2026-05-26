import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import BrowserOnly from '@docusaurus/BrowserOnly';
import graphData from '@site/src/data/graph-data.json';
import styles from './graph.module.css';

const DOCUMENT_COLOR = '#2563eb';
const HEADING_COLOR = '#16a34a';
const MISSING_COLOR = '#dc2626';
const HIGHLIGHT_COLOR = '#f59e0b';

const APPEARANCES = {
  obsidian: {
    label: 'Obsidian',
    documentColor: DOCUMENT_COLOR,
    headingColor: HEADING_COLOR,
    missingColor: MISSING_COLOR,
    labelColor: '#e5e7eb',
    strokeColor: 'rgba(255,255,255,0.75)',
    link: {
      contains: 'rgba(148, 163, 184, 0.28)',
      heading: 'rgba(34, 197, 94, 0.42)',
      missing: 'rgba(248, 113, 113, 0.5)',
      default: 'rgba(147, 197, 253, 0.34)',
    },
  },
  light: {
    label: 'Světlý',
    documentColor: '#1d4ed8',
    headingColor: '#15803d',
    missingColor: '#b91c1c',
    labelColor: '#111827',
    strokeColor: 'rgba(15,23,42,0.38)',
    link: {
      contains: 'rgba(100, 116, 139, 0.24)',
      heading: 'rgba(22, 163, 74, 0.34)',
      missing: 'rgba(220, 38, 38, 0.38)',
      default: 'rgba(37, 99, 235, 0.26)',
    },
  },
  contrast: {
    label: 'Kontrastní',
    documentColor: '#38bdf8',
    headingColor: '#a3e635',
    missingColor: '#fb7185',
    labelColor: '#f8fafc',
    strokeColor: 'rgba(255,255,255,0.88)',
    link: {
      contains: 'rgba(226, 232, 240, 0.34)',
      heading: 'rgba(163, 230, 53, 0.55)',
      missing: 'rgba(251, 113, 133, 0.62)',
      default: 'rgba(56, 189, 248, 0.48)',
    },
  },
};

const normalizeText = (value) =>
  value
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const colorWithOpacity = (color, opacity) => {
  if (!color.startsWith('rgba(')) return color;

  return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${opacity})`);
};

const linkColor = (type, appearance, opacity) => {
  const color = appearance.link[type] ?? appearance.link.default;
  return colorWithOpacity(color, opacity);
};

const nodeColor = (node, appearance) => {
  if (node.type === 'heading') return appearance.headingColor;
  if (node.type === 'missing') return appearance.missingColor;
  return appearance.documentColor;
};

const nodeRadius = (node, scale = 1) => {
  const radius = node.type === 'heading'
    ? 4.5
    : node.type === 'missing'
      ? 5
      : Math.min(12, 5.5 + Math.sqrt(node.degree || 1) * 1.3);

  return radius * scale;
};

const mergeUrl = (baseUrl, url) => {
  if (!url) return null;

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;

  return `${normalizedBase}${normalizedUrl}`;
};

function useGraphViewData({showHeadings, showMissing, selectedGroup}) {
  return useMemo(() => {
    const allNodes = graphData.nodes;
    const sourceNodeById = new Map(allNodes.map((node) => [node.id, node]));

    const visibleNodes = allNodes.filter((node) => {
      if (node.type === 'heading' && !showHeadings) return false;
      if (node.type === 'missing' && !showMissing) return false;
      if (selectedGroup !== 'all' && node.group !== selectedGroup) return false;
      return true;
    });

    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const linkKeys = new Set();
    const links = [];

    for (const link of graphData.links) {
      const source = sourceNodeById.get(link.source);
      const target = sourceNodeById.get(link.target);

      if (!source || !target) continue;
      if (link.type === 'contains' && !showHeadings) continue;
      if (target.type === 'missing' && !showMissing) continue;
      if (source.type === 'missing' && !showMissing) continue;

      const displayedSource = source.type === 'heading' && !showHeadings ? source.parentId : source.id;
      const displayedTarget = target.type === 'heading' && !showHeadings ? target.parentId : target.id;

      if (displayedSource === displayedTarget) continue;
      if (!visibleIds.has(displayedSource) || !visibleIds.has(displayedTarget)) continue;

      const key = `${displayedSource}|${displayedTarget}|${link.type}`;
      if (linkKeys.has(key)) continue;
      linkKeys.add(key);

      links.push({
        ...link,
        source: displayedSource,
        target: displayedTarget,
      });
    }

    return {nodes: visibleNodes, links};
  }, [showHeadings, showMissing, selectedGroup]);
}

function GraphCanvas({graph, searchTerm, selectedNodeId, onSelectNode, settings}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef({nodes: [], links: []});
  const transformRef = useRef({x: 0, y: 0, k: 1});
  const pointerRef = useRef({mode: null, node: null, x: 0, y: 0, startX: 0, startY: 0, moved: false});
  const [hoverNodeId, setHoverNodeId] = useState(null);

  const searchNeedle = useMemo(() => normalizeText(searchTerm.trim()), [searchTerm]);
  const appearance = APPEARANCES[settings.appearance] ?? APPEARANCES.obsidian;

  const graphIndex = useMemo(() => {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const neighbors = new Map(graph.nodes.map((node) => [node.id, new Set()]));

    for (const link of graph.links) {
      neighbors.get(link.source)?.add(link.target);
      neighbors.get(link.target)?.add(link.source);
    }

    return {nodeById, neighbors};
  }, [graph]);

  useEffect(() => {
    const previous = new Map(simulationRef.current.nodes.map((node) => [node.id, node]));
    const width = containerRef.current?.clientWidth || 1200;
    const height = containerRef.current?.clientHeight || 720;
    const groups = Array.from(new Set(graph.nodes.map((node) => node.group)));

    const nodes = graph.nodes.map((node, index) => {
      const existing = previous.get(node.id);
      const groupIndex = Math.max(0, groups.indexOf(node.group));
      const angle = (Math.PI * 2 * (index + groupIndex * 7)) / Math.max(1, graph.nodes.length);
      const ring = 120 + groupIndex * 80;

      return {
        ...node,
        x: existing?.x ?? Math.cos(angle) * ring + width / 2,
        y: existing?.y ?? Math.sin(angle) * ring + height / 2,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        r: nodeRadius(node, settings.nodeScale),
      };
    });

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const links = graph.links
      .map((link) => ({
        ...link,
        sourceNode: nodeById.get(link.source),
        targetNode: nodeById.get(link.target),
      }))
      .filter((link) => link.sourceNode && link.targetNode);

    simulationRef.current = {nodes, links};
  }, [graph, settings.nodeScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return undefined;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    let frameId;

    if (!canvas) return undefined;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const scale = window.devicePixelRatio || 1;
      const width = canvas.width / scale;
      const height = canvas.height / scale;
      const {nodes, links} = simulationRef.current;
      const transform = transformRef.current;
      const hoverNeighbors = hoverNodeId ? graphIndex.neighbors.get(hoverNodeId) : null;

      ctx.save();
      ctx.scale(scale, scale);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];

        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < 0.01) {
            dx = 0.1;
            dy = 0.1;
            distanceSquared = 0.02;
          }

          const distance = Math.sqrt(distanceSquared);
          const force = Math.min(1.2 * settings.chargeScale, (900 * settings.chargeScale) / distanceSquared);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      for (const link of links) {
        const source = link.sourceNode;
        const target = link.targetNode;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const baseDesired = link.type === 'contains' ? 38 : link.type === 'heading' ? 80 : 120;
        const desired = baseDesired * settings.linkLengthScale;
        const strength = (link.type === 'contains' ? 0.045 : 0.025) * settings.linkStrengthScale;
        const force = (distance - desired) * strength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      for (const node of nodes) {
        node.vx += (width / 2 - node.x) * 0.002 * settings.gravityScale;
        node.vy += (height / 2 - node.y) * 0.002 * settings.gravityScale;
        node.vx *= 0.84;
        node.vy *= 0.84;

        if (!node.fx) node.x += node.vx;
        if (!node.fy) node.y += node.vy;
      }

      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      for (const link of links) {
        const isHighlighted =
          link.source === hoverNodeId ||
          link.target === hoverNodeId ||
          link.source === selectedNodeId ||
          link.target === selectedNodeId;

        ctx.beginPath();
        ctx.moveTo(link.sourceNode.x, link.sourceNode.y);
        ctx.lineTo(link.targetNode.x, link.targetNode.y);
        ctx.strokeStyle = isHighlighted ? HIGHLIGHT_COLOR : linkColor(link.type, appearance, settings.linkOpacity);
        ctx.lineWidth = isHighlighted ? 2.4 / transform.k : link.type === 'contains' ? 0.8 / transform.k : 1.2 / transform.k;
        ctx.setLineDash(link.type === 'contains' ? [4 / transform.k, 4 / transform.k] : []);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      for (const node of nodes) {
        const matched = searchNeedle && normalizeText(node.title).includes(searchNeedle);
        const connectedToHover = hoverNeighbors?.has(node.id);
        const isActive = node.id === hoverNodeId || node.id === selectedNodeId || connectedToHover || matched;
        const faded = (hoverNodeId || searchNeedle) && !isActive;

        ctx.globalAlpha = faded ? 0.18 : 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? HIGHLIGHT_COLOR : nodeColor(node, appearance);
        ctx.fill();
        ctx.lineWidth = (node.id === selectedNodeId ? 3 : 1.5) / transform.k;
        ctx.strokeStyle = appearance.strokeColor;
        ctx.stroke();

        const shouldShowLabel =
          settings.labelMode === 'all' ||
          (settings.labelMode === 'documents' && node.type === 'document') ||
          matched ||
          node.id === hoverNodeId ||
          node.id === selectedNodeId ||
          (settings.labelMode !== 'hidden' && transform.k > 1.35);

        if (shouldShowLabel) {
          const fontSize = Math.max(9, Math.min(13, 11 / Math.sqrt(transform.k)));
          ctx.font = `${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = appearance.labelColor;
          ctx.fillText(node.title, node.x, node.y + node.r + 4 / transform.k);
        }

        ctx.globalAlpha = 1;
      }

      ctx.restore();
      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [appearance, graphIndex, hoverNodeId, searchNeedle, selectedNodeId, settings]);

  const screenToGraph = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const transform = transformRef.current;

    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top - transform.y) / transform.k,
    };
  };

  const findNodeAt = (point) => {
    const {nodes} = simulationRef.current;

    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      const dx = point.x - node.x;
      const dy = point.y - node.y;
      const hitRadius = node.r + 5 / transformRef.current.k;

      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }

    return null;
  };

  const handlePointerDown = (event) => {
    const point = screenToGraph(event.clientX, event.clientY);
    const node = findNodeAt(point);

    pointerRef.current = {
      mode: node ? 'drag-node' : 'pan',
      node,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      graphX: point.x,
      graphY: point.y,
      moved: false,
    };

    if (node) {
      node.fx = true;
      node.fy = true;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const pointer = pointerRef.current;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;

    if (pointer.mode) {
      const totalDx = event.clientX - pointer.startX;
      const totalDy = event.clientY - pointer.startY;

      if (!pointer.moved && Math.abs(totalDx) + Math.abs(totalDy) > 5) {
        pointer.moved = true;
      }

      if (pointer.moved) {
        if (pointer.mode === 'pan') {
          transformRef.current.x += dx;
          transformRef.current.y += dy;
        } else if (pointer.node) {
          const point = screenToGraph(event.clientX, event.clientY);
          pointer.node.x = point.x;
          pointer.node.y = point.y;
          pointer.node.vx = 0;
          pointer.node.vy = 0;
        }
      }

      pointer.x = event.clientX;
      pointer.y = event.clientY;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const hover = findNodeAt(screenToGraph(event.clientX, event.clientY));
    setHoverNodeId(hover?.id ?? null);
  };

  const handlePointerUp = (event) => {
    const pointer = pointerRef.current;

    if (pointer.node) {
      pointer.node.fx = false;
      pointer.node.fy = false;

      if (!pointer.moved) {
        onSelectNode(pointer.node.id);
      }
    }

    pointerRef.current = {mode: null, node: null, x: 0, y: 0, startX: 0, startY: 0, moved: false};
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const transform = transformRef.current;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const graphX = (pointerX - transform.x) / transform.k;
    const graphY = (pointerY - transform.y) / transform.k;
    const nextScale = Math.max(0.2, Math.min(4, transform.k * (event.deltaY > 0 ? 0.9 : 1.1)));

    transform.x = pointerX - graphX * nextScale;
    transform.y = pointerY - graphY * nextScale;
    transform.k = nextScale;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    canvas.addEventListener('wheel', handleWheel, {passive: false});

    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const resetView = () => {
    transformRef.current = {x: 0, y: 0, k: 1};
  };

  return (
    <div ref={containerRef} className={`${styles.canvasWrap} ${styles[`canvasWrap_${settings.appearance}`] ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHoverNodeId(null)}
      />
      <button type="button" className={styles.resetButton} onClick={resetView}>
        Reset
      </button>
    </div>
  );
}

function GraphContent() {
  const baseUrl = useBaseUrl('/');
  const [showHeadings, setShowHeadings] = useState(true);
  const [showMissing, setShowMissing] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appearance, setAppearance] = useState('obsidian');
  const [labelMode, setLabelMode] = useState('documents');
  const [nodeScale, setNodeScale] = useState(1);
  const [linkOpacity, setLinkOpacity] = useState(0.36);
  const [linkLengthScale, setLinkLengthScale] = useState(1);
  const [linkStrengthScale, setLinkStrengthScale] = useState(1);
  const [chargeScale, setChargeScale] = useState(1);
  const [gravityScale, setGravityScale] = useState(1);

  const groups = useMemo(() => {
    const uniqueGroups = Array.from(new Set(graphData.nodes.map((node) => node.group)));
    return ['all', ...uniqueGroups];
  }, []);

  const viewGraph = useGraphViewData({showHeadings, showMissing, selectedGroup});
  const graphSettings = useMemo(() => ({
    appearance,
    labelMode,
    nodeScale,
    linkOpacity,
    linkLengthScale,
    linkStrengthScale,
    chargeScale,
    gravityScale,
  }), [appearance, chargeScale, gravityScale, labelMode, linkLengthScale, linkOpacity, linkStrengthScale, nodeScale]);
  const nodeById = useMemo(() => new Map(graphData.nodes.map((node) => [node.id, node])), []);
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : null;
  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [];

    return graphData.links
      .filter((link) => link.source === selectedNode.id || link.target === selectedNode.id)
      .map((link) => {
        const otherId = link.source === selectedNode.id ? link.target : link.source;
        return {
          link,
          node: nodeById.get(otherId),
        };
      })
      .filter((item) => item.node)
      .slice(0, 12);
  }, [nodeById, selectedNode]);

  const openSelected = () => {
    const target = mergeUrl(baseUrl, selectedNode?.url);

    if (target) {
      window.location.href = target;
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.toolbar} aria-label="Ovládání grafu">
        <div className={styles.searchBox}>
          <label htmlFor="graph-search">Hledat</label>
          <input
            id="graph-search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Název stránky nebo nadpisu"
          />
        </div>

        <button
          type="button"
          className={styles.settingsToggle}
          aria-expanded={settingsOpen}
          aria-controls="graph-settings"
          onClick={() => setSettingsOpen((current) => !current)}
        >
          Nastavení
        </button>

        <div className={styles.stats}>
          <span>{viewGraph.nodes.length} uzlů</span>
          <span>{viewGraph.links.length} hran</span>
        </div>
      </section>

      {settingsOpen && (
        <section id="graph-settings" className={styles.settingsPanel} aria-label="Nastavení grafu">
          <div className={styles.settingsGroup}>
            <h2>Data</h2>
            <div className={styles.segmentControl} aria-label="Okruh">
              {groups.map((group) => (
                <button
                  key={group}
                  type="button"
                  aria-pressed={selectedGroup === group}
                  onClick={() => setSelectedGroup(group)}
                >
                  {group === 'all' ? 'Vše' : group}
                </button>
              ))}
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={showHeadings} onChange={(event) => setShowHeadings(event.target.checked)} />
              Zahrnout nadpisy
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={showMissing} onChange={(event) => setShowMissing(event.target.checked)} />
              Zobrazit chybějící odkazy
            </label>
          </div>

          <div className={styles.settingsGroup}>
            <h2>Vzhled</h2>
            <div className={styles.selectBox}>
              <label htmlFor="graph-appearance">Motiv</label>
              <select id="graph-appearance" value={appearance} onChange={(event) => setAppearance(event.target.value)}>
                {Object.entries(APPEARANCES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.selectBox}>
              <label htmlFor="graph-labels">Popisky</label>
              <select id="graph-labels" value={labelMode} onChange={(event) => setLabelMode(event.target.value)}>
                <option value="documents">Dokumenty</option>
                <option value="all">Všechny uzly</option>
                <option value="active">Jen aktivní a přiblížené</option>
                <option value="hidden">Jen hledání/výběr</option>
              </select>
            </div>
            <label className={styles.rangeControl}>
              <span>Velikost uzlů</span>
              <input type="range" min="0.7" max="1.6" step="0.05" value={nodeScale} onChange={(event) => setNodeScale(Number(event.target.value))} />
              <output>{nodeScale.toFixed(2)}x</output>
            </label>
            <label className={styles.rangeControl}>
              <span>Viditelnost hran</span>
              <input type="range" min="0.12" max="0.8" step="0.02" value={linkOpacity} onChange={(event) => setLinkOpacity(Number(event.target.value))} />
              <output>{Math.round(linkOpacity * 100)}%</output>
            </label>
          </div>

          <div className={styles.settingsGroup}>
            <h2>Fyzika</h2>
            <label className={styles.rangeControl}>
              <span>Délka hran</span>
              <input type="range" min="0.65" max="1.6" step="0.05" value={linkLengthScale} onChange={(event) => setLinkLengthScale(Number(event.target.value))} />
              <output>{linkLengthScale.toFixed(2)}x</output>
            </label>
            <label className={styles.rangeControl}>
              <span>Síla hran</span>
              <input type="range" min="0.4" max="1.8" step="0.05" value={linkStrengthScale} onChange={(event) => setLinkStrengthScale(Number(event.target.value))} />
              <output>{linkStrengthScale.toFixed(2)}x</output>
            </label>
            <label className={styles.rangeControl}>
              <span>Odpuzování</span>
              <input type="range" min="0.45" max="1.8" step="0.05" value={chargeScale} onChange={(event) => setChargeScale(Number(event.target.value))} />
              <output>{chargeScale.toFixed(2)}x</output>
            </label>
            <label className={styles.rangeControl}>
              <span>Gravitace ke středu</span>
              <input type="range" min="0.2" max="2" step="0.05" value={gravityScale} onChange={(event) => setGravityScale(Number(event.target.value))} />
              <output>{gravityScale.toFixed(2)}x</output>
            </label>
          </div>
        </section>
      )}

      <section className={styles.graphShell}>
        <GraphCanvas
          graph={viewGraph}
          searchTerm={searchTerm}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          settings={graphSettings}
        />

        <aside className={styles.sidePanel} aria-label="Detail uzlu">
          {selectedNode ? (
            <>
              <div className={styles.nodeKind}>
                {selectedNode.type === 'heading' ? 'Nadpis' : selectedNode.type === 'missing' ? 'Chybějící stránka' : 'Dokument'}
              </div>
              <h1>{selectedNode.title}</h1>
              {selectedNode.folder && <p className={styles.folder}>{selectedNode.folder}</p>}
              {selectedNode.parentTitle && <p className={styles.folder}>Součást: {selectedNode.parentTitle}</p>}
              {selectedNode.summary && <p className={styles.summary}>{selectedNode.summary}</p>}

              <dl className={styles.metrics}>
                <div>
                  <dt>Příchozí</dt>
                  <dd>{selectedNode.incoming}</dd>
                </div>
                <div>
                  <dt>Odchozí</dt>
                  <dd>{selectedNode.outgoing}</dd>
                </div>
              </dl>

              <div className={styles.actions}>
                {selectedNode.url && (
                  <button type="button" onClick={openSelected}>
                    Otevřít
                  </button>
                )}
                <button type="button" onClick={() => setSelectedNodeId(null)}>
                  Zavřít
                </button>
              </div>

              {selectedConnections.length > 0 && (
                <div className={styles.connectionList}>
                  <h2>Propojení</h2>
                  {selectedConnections.map(({link, node}) => (
                    <button key={`${link.source}-${link.target}-${node.id}`} type="button" onClick={() => setSelectedNodeId(node.id)}>
                      <span>{node.title}</span>
                      <small>{link.type}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyPanel}>
              <h1>Graf znalostí</h1>
              <p>
                Kliknutím vybereš uzel, tažením jej posuneš. Kolečkem přibližuješ a tažením prázdné plochy posouváš celý graf.
              </p>
              <dl className={styles.metrics}>
                <div>
                  <dt>Dokumenty</dt>
                  <dd>{graphData.stats.documents}</dd>
                </div>
                <div>
                  <dt>Nadpisy</dt>
                  <dd>{graphData.stats.headings}</dd>
                </div>
                <div>
                  <dt>Hrany</dt>
                  <dd>{graphData.stats.links}</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default function GraphPage() {
  return (
    <Layout title="Graf znalostí" description="Interaktivní graf odkazů mezi poznámkami">
      <BrowserOnly fallback={<main className={styles.loadingPage}>Načítám graf...</main>}>
        {() => <GraphContent />}
      </BrowserOnly>
    </Layout>
  );
}
