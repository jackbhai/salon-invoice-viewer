import React, { useRef, useState } from 'react'
import { FileUp, UploadCloud, RefreshCw, Database, X, CheckCircle2, FileJson, Wand2 } from 'lucide-react'
import { normalizeData } from '../lib/data.js'
import { makeSample } from '../lib/sample.js'

export default function Upload({ onLoaded, existing }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  async function loadFile(file) {
    setError(null); setOk(null); setBusy(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = normalizeData(json)
      if (!result.invoices.length) throw new Error('No invoices found in this file.')
      result.label = file.name.replace(/\.json$/i, '')
      await onLoaded(result)
      const total = result.invoices.length
      setOk(`Successfully loaded ${total.toLocaleString('en-IN')} invoices from "${file.name}".`)
    } catch (e) {
      setError('Could not parse JSON: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) loadFile(f)
  }

  function useSample() {
    setError(null); setOk(null); setBusy(true)
    setTimeout(() => {
      const s = makeSample()
      const result = normalizeData(s)
      result.label = 'sample-demo-data'
      onLoaded(result)
      setOk(`Loaded ${result.invoices.length} sample invoices (demo). Make sure to upload your real JSON too.`)
      setBusy(false)
    }, 150)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Load your invoice data</h2>
        <p className="text-sm text-amoled-muted mt-1">
          Upload the same JSON format used by your exporter. Works with a full object (<code className="text-cyan-300">{'{ "shop":..., "invoices":[...] }'}</code>), a bare array, or a map of invoice records.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging ? 'border-cyan-400 bg-cyan-500/5' : 'border-amoled-border2 bg-amoled-card hover:border-cyan-500/40'
        }`}
      >
        <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300">
          <UploadCloud size={28} />
        </div>
        <p className="mt-4 text-sm font-semibold">Drag & drop your JSON file here</p>
        <p className="text-xs text-amoled-dim mt-1">or tap to browse · .json / .jsonl</p>
        <button className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-black text-sm font-semibold hover:bg-cyan-400">
          <FileUp size={16} /> Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.jsonl,application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
        />
      </div>

      {busy && <Busy />}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm p-4 flex items-start gap-2">
          <X size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm p-4 flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> <span>{ok}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-amoled-border bg-amoled-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database size={16} className="text-violet-300" /> Live preview
          </div>
          <p className="text-xs text-amoled-muted mt-2 leading-relaxed">
            Your data stays <strong className="text-amoled-text">in your browser</strong> (local storage). Nothing is uploaded to any server.
            {existing ? ` Currently loaded: ${existing.invoices.length.toLocaleString('en-IN')} invoices.` : ''}
          </p>
        </div>
        <div className="rounded-xl border border-amoled-border bg-amoled-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 size={16} className="text-amber-300" /> No file yet?
          </div>
          <p className="text-xs text-amoled-muted mt-2 leading-relaxed">Explore with generated demo data to see every feature before you upload your real JSON.</p>
          <button
            onClick={useSample}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-50"
          >
            <RefreshCw size={12} /> Load demo data
          </button>
        </div>
      </div>
    </div>
  )
}

function Busy() {
  return (
    <div className="rounded-xl border border-amoled-border bg-amoled-card p-4 flex items-center gap-3 text-sm text-amoled-muted">
      <div className="w-5 h-5 rounded-full border-2 border-amoled-border2 border-t-cyan-400 animate-spin" />
      Parsing and loading…
    </div>
  )
}
