// ---------------------------------------------------------------------------
// SEO tab — generate Meta Tags, Meta Description, and an account-specific
// Mobile Description from a Variation Matrix title or a manually entered title.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import type { AccountConfig } from "../types";
import { buildSeoCsv, generateSeo, parseSeoFacts, type SeoFacts } from "../lib/seoGenerator";
import { MAIN_VARIATIONS, CUSTOM_VARIATIONS } from '../config/variations';
import { downloadText } from "../lib/download";
import { CopyButton, Field } from "./ui";
import type { MatrixTitleRef } from "../types";

interface Props {
  accounts: AccountConfig[];
  matrixTitles: MatrixTitleRef[];
}

interface EditableSeo {
  title: string;
  accountName: string;
  metaTags: string;
  metaDescription: string;
  mobileDescription: string;
}

function countText(s: string): string {
  const chars = s.length;
  const words = s.trim() ? s.trim().split(/[\s,]+/).filter(Boolean).length : 0;
  return `${chars} chars · ${words} terms`;
}

function OutputCard({
  title,
  value,
  onChange,
  rows = 4,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="seo-card">
      <div className="seo-card-head">
        <span className="seo-card-title">{title}</span>
        <CopyButton text={value} />
      </div>
      <textarea className="seo-textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-label={title} />
      <div className="seo-count">{countText(value)}</div>
    </div>
  );
}

export function SeoPanel({ accounts, matrixTitles }: Props) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.enabled), [accounts]);
  const [source, setSource] = useState<"matrix" | "manual">("manual");
  const [matrixIdx, setMatrixIdx] = useState(0);
  const [manualTitle, setManualTitle] = useState("");
  const [manualFacts, setManualFacts] = useState<SeoFacts>(() => parseSeoFacts(''));
  const [accountId, setAccountId] = useState<string>(() => activeAccounts[0]?.id ?? "");
  const [seo, setSeo] = useState<EditableSeo | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const selectedAccount = activeAccounts.find((a) => a.id === accountId) ?? null;

  // Only show Variation Matrix titles that belong to the selected account.
  const matrixForAccount = useMemo(
    () => matrixTitles.filter((t) => t.accountId === accountId),
    [matrixTitles, accountId],
  );

  const changeAccount = (id: string) => {
    setAccountId(id);
    setMatrixIdx(0);
  };

  const currentTitle = () => {
    if (source === "matrix") return matrixForAccount[matrixIdx]?.title ?? "";
    return manualTitle.trim();
  };

  const handleGenerate = () => {
    const title = currentTitle();
    if (!title) {
      setWarning(source === "matrix" ? "Generate titles in the Variation Matrix first, or switch to manual." : "Enter a title.");
      return;
    }
    setWarning(null);
    const facts = source === 'matrix' ? matrixForAccount[matrixIdx]?.facts : manualFacts;
    const r = generateSeo(title, selectedAccount, facts);
    setSeo({
      title: r.title,
      accountName: r.accountName,
      metaTags: r.metaTags,
      metaDescription: r.metaDescription,
      mobileDescription: r.mobileDescription,
    });
  };

  const patch = (k: keyof EditableSeo, v: string) => setSeo((s) => (s ? { ...s, [k]: v } : s));

  const copyAll = async () => {
    if (!seo) return;
    const text = `META TAGS:\n${seo.metaTags}\n\nMETA DESCRIPTION:\n${seo.metaDescription}\n\nMOBILE DESCRIPTION:\n${seo.mobileDescription}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1600);
  };

  const exportCsv = () => {
    if (!seo) return;
    downloadText("seo.csv", "﻿" + buildSeoCsv([{
      title: seo.title,
      accountName: seo.accountName,
      metaTags: seo.metaTags,
      metaDescription: seo.metaDescription,
      mobileDescription: seo.mobileDescription,
    }]));
  };

  return (
    <section className="card" aria-label="SEO content generator">
      <h2 className="card-title">SEO Content Generator</h2>
      <p className="muted-hint" style={{ marginTop: 0 }}>
        Generate Meta Tags, Meta Description, and an account-specific Mobile Description for a seat-cover listing title.
      </p>

      {/* Step 1 — Account */}
      <div className="step-head"><span className="step-num">1</span> Select Account</div>
      <select className="converter-account-select" value={accountId} onChange={(e) => changeAccount(e.target.value)} aria-label="Select account">
        {activeAccounts.length === 0 && <option value="">No active accounts</option>}
        {activeAccounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <p className="muted-hint" style={{ marginTop: 6 }}>The account sets the Mobile Description and filters the Variation Matrix titles below.</p>

      {/* Step 2 — Title */}
      <div className="step-head"><span className="step-num">2</span> Select or Enter Title</div>
      <div className="seo-source">
        <label className="radio-pill">
          <input type="radio" checked={source === "matrix"} onChange={() => setSource("matrix")} disabled={matrixForAccount.length === 0} />
          <span>From Variation Matrix{matrixForAccount.length ? ` (${matrixForAccount.length})` : " — none for this account"}</span>
        </label>
        <label className="radio-pill">
          <input type="radio" checked={source === "manual"} onChange={() => setSource("manual")} />
          <span>Enter manually</span>
        </label>
      </div>
      {source === "matrix" ? (
        <select value={matrixIdx} onChange={(e) => setMatrixIdx(Number(e.target.value))} aria-label="Select a matrix title" disabled={matrixForAccount.length === 0}>
          {matrixForAccount.length === 0 && <option>No titles for this account — generate in Variation Matrix</option>}
          {matrixForAccount.map((t, i) => (
            <option key={i} value={i}>{t.variationName} — {t.title}</option>
          ))}
        </select>
      ) : (
        <input
          value={manualTitle}
          onChange={(e) => { setManualTitle(e.target.value); setManualFacts(parseSeoFacts(e.target.value)); }}
          placeholder="e.g. 2014-2020 Fits Mercedes-Benz S-Class W222 Driver Bottom Leather Prf. Cover Black"
          aria-label="Manual title"
        />
      )}

      {source === 'manual' ? (
        <div className="cpis-rule-controls">
          <h3>Review product facts for SEO</h3>
          <p className="muted-hint">Check the facts read from your title. CPIS generates SEO from these fields, keeping full years and the correct product identity.</p>
          <div className="form-grid">
            {([['yearRange', 'Full years'], ['make', 'Make'], ['model', 'Model'], ['material', 'Material'], ['color', 'Color']] as const).map(([key, label]) => (
              <Field key={key} label={label}>
                <input aria-label={`SEO ${label}`} value={manualFacts[key]}
                  onChange={event => setManualFacts(previous => ({ ...previous, [key]: event.target.value }))} />
              </Field>
            ))}
            <Field label="Product / variation">
              <select aria-label="SEO product variation" value={manualFacts.variationId ?? ''} onChange={event => {
                const variation = [...MAIN_VARIATIONS, ...CUSTOM_VARIATIONS].find(item => item.id === event.target.value);
                setManualFacts(previous => ({ ...previous, variationId: variation?.id ?? '', variation: variation?.label ?? '' }));
              }}>
                <option value="">Seat cover — unspecified variation</option>
                {[...MAIN_VARIATIONS, ...CUSTOM_VARIATIONS].map(variation => <option key={variation.id} value={variation.id}>{variation.label}</option>)}
              </select>
            </Field>
          </div>
        </div>
      ) : <p className="muted-hint">SEO uses the product facts saved with this matrix result, including full years. Edited titles are included.</p>}

      {/* Step 3 — Generate */}
      <div className="step-head"><span className="step-num">3</span> Generate SEO</div>
      <button type="button" className="btn btn-primary" onClick={handleGenerate}>Generate SEO</button>

      {warning && <div className="warning" role="alert">{warning}</div>}

      {seo && (
        <>
          <div className="step-head"><span className="step-num">4</span> SEO Output</div>
          <div className="seo-grid">
            <OutputCard title="Meta Tags" value={seo.metaTags} onChange={(v) => patch("metaTags", v)} rows={6} />
            <OutputCard title="Meta Description" value={seo.metaDescription} onChange={(v) => patch("metaDescription", v)} rows={8} />
            <OutputCard title="Mobile Description" value={seo.mobileDescription} onChange={(v) => patch("mobileDescription", v)} rows={5} />
          </div>
          <div className="results-actions">
            <button type="button" className="btn btn-secondary" onClick={copyAll}>{copiedAll ? "✓ Copied All" : "Copy All SEO"}</button>
            <button type="button" className="btn btn-secondary" onClick={exportCsv}>Export SEO CSV</button>
          </div>
        </>
      )}

      {!seo && !warning && <p className="placeholder">Choose a title and account, then generate SEO content.</p>}
    </section>
  );
}
