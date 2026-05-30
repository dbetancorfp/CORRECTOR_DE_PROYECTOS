import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function RAGPipeline() {
  const [expandedPhase, setExpandedPhase] = useState('overview');

  const phases = [
    {
      id: 'entrada',
      title: '1. ENTRADA',
      color: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-300',
      items: [
        {
          label: 'Boceto Numerado',
          desc: 'imagen + boceto-metadata.json',
          icon: '🎨'
        },
        {
          label: 'Conversación Cliente',
          desc: 'texto con referencias a #números',
          icon: '💬'
        }
      ]
    },
    {
      id: 'rag',
      title: '2. RAG (pgvector)',
      color: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-300',
      items: [
        {
          label: 'Knowledge Base',
          desc: 'PostgreSQL + HNSW index',
          fields: ['id', 'content', 'embedding', 'phase', 'sketch_number', 'version']
        },
        {
          label: 'Búsqueda Híbrida',
          desc: 'Vector + Filtros estructurados',
          icon: '🔍'
        }
      ]
    },
    {
      id: 'agentes',
      title: '3. AGENTES ESPECIALIZADOS',
      color: 'from-green-50 to-green-100',
      borderColor: 'border-green-300',
      items: [
        {
          label: 'Agente 1: Diseñador Front',
          desc: 'Genera: UI Spec JSON',
          output: 'ui-spec.json'
        },
        {
          label: 'Agente 2: Analista de Negocio',
          desc: 'Genera: Functional Spec JSON',
          output: 'functional-spec.json'
        },
        {
          label: '🚪 GATE HUMANO: Reconciliación',
          desc: '✓ sketchNumber integridad',
          output: 'reconciliation.json',
          critical: true
        },
        {
          label: 'Agente 3: Arquitecto Requisitos',
          desc: 'Genera: Casos de uso + Esquema SQL',
          output: 'use-cases.md + schema.sql'
        },
        {
          label: 'Agente 4: Ingeniero TDD',
          desc: 'Genera: Tests ROJO',
          output: 'tests/*.test.js'
        },
        {
          label: 'Agente 5: Implementador',
          desc: 'Genera: Código (tests VERDE)',
          output: 'src/ (backend + frontend)'
        },
        {
          label: 'Agente 6: Revisor (opcional)',
          desc: 'Valida: Calidad + OO',
          output: 'refactor suggestions'
        }
      ]
    },
    {
      id: 'codigo',
      title: '4. CÓDIGO EJECUTABLE',
      color: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-300',
      items: [
        {
          label: 'Backend',
          desc: 'Node.js + Express + PostgreSQL',
          icon: '⚙️'
        },
        {
          label: 'Frontend',
          desc: 'Web Components OO + Tailwind',
          icon: '🎨'
        },
        {
          label: 'Tests',
          desc: 'Vitest + @web/test-runner',
          icon: '✅'
        }
      ]
    },
    {
      id: 'docs',
      title: '5. DOCUMENTACIÓN',
      color: 'from-pink-50 to-pink-100',
      borderColor: 'border-pink-300',
      items: [
        {
          label: 'VitePress + GitHub Pages',
          desc: 'Documentación generada automáticamente',
          icon: '📚'
        }
      ]
    }
  ];

  const sketchNumberFlow = [
    {
      stage: 'Boceto',
      content: '#7 = Botón',
      x: '0%'
    },
    {
      stage: 'UI Spec',
      content: 'sketchNumber: 7',
      x: '20%'
    },
    {
      stage: 'Func Spec',
      content: 'sketchNumber: 7',
      x: '40%'
    },
    {
      stage: 'Use Case',
      content: 'UC1: [#7]',
      x: '60%'
    },
    {
      stage: 'Test',
      content: "describe('Button #7')",
      x: '80%'
    },
    {
      stage: 'Código',
      content: 'class Button7 {}',
      x: '100%'
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <style>{`
        @keyframes flow {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .flow-item { animation: flow 0.6s ease-out; }
      `}</style>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">
          🔄 RAG Spec-Driven Development
        </h1>
        <p className="text-lg text-slate-600">
          Pipeline multi-agente: boceto + cliente → código completo con trazabilidad
        </p>
      </div>

      {/* sketchNumber Flow */}
      <div className="mb-8 bg-white rounded-lg border-2 border-indigo-300 p-6 shadow-md">
        <h2 className="text-xl font-bold text-indigo-900 mb-4">
          🔑 La Clave: sketchNumber
        </h2>
        <div className="relative h-32 flex items-center justify-between">
          {/* Línea conectora */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <div className="w-full h-1 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200"></div>
          </div>

          {/* Nodos */}
          {sketchNumberFlow.map((node, idx) => (
            <div
              key={idx}
              className="relative z-10 flex flex-col items-center gap-2 flow-item"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-sm">
                {idx + 1}
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-slate-700">{node.stage}</div>
                <div className="text-xs text-indigo-600 font-mono">{node.content}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 mt-4 text-center">
          El número vincula <strong>visual → funcional → test → código</strong>. Trazabilidad garantizada.
        </p>
      </div>

      {/* Fases principales */}
      <div className="space-y-4">
        {phases.map((phase, phaseIdx) => (
          <div
            key={phase.id}
            className={`bg-gradient-to-r ${phase.color} border-l-4 ${phase.borderColor} rounded-lg overflow-hidden shadow-md flow-item`}
            style={{ animationDelay: `${phaseIdx * 0.15}s` }}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              className="w-full p-4 flex items-center justify-between hover:opacity-80 transition"
            >
              <h2 className="text-lg font-bold text-slate-800">{phase.title}</h2>
              {expandedPhase === phase.id ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>

            {/* Contenido expandible */}
            {expandedPhase === phase.id && (
              <div className="px-4 pb-4 space-y-3 bg-white bg-opacity-60">
                {phase.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className={`p-3 rounded border-l-4 ${item.critical ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <div className="font-semibold text-slate-800">
                      {item.icon && <span className="mr-2">{item.icon}</span>}
                      {item.label}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{item.desc}</div>

                    {/* Output */}
                    {item.output && (
                      <div className="text-xs text-slate-500 mt-2 font-mono bg-white px-2 py-1 rounded inline-block">
                        → {item.output}
                      </div>
                    )}

                    {/* Fields */}
                    {item.fields && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.fields.map((f, i) => (
                          <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Handoff Flow */}
      <div className="mt-8 bg-white rounded-lg border-2 border-slate-300 p-6 shadow-md flow-item">
        <h2 className="text-xl font-bold text-slate-800 mb-4">🤝 Handoff Pattern</h2>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { step: '1', label: 'Generar', color: 'bg-blue-100' },
            { step: '2', label: 'Validar (Zod)', color: 'bg-yellow-100' },
            { step: '3', label: 'Persistir', color: 'bg-green-100' },
            { step: '4', label: 'Buscar (RAG)', color: 'bg-purple-100' },
            { step: '5', label: 'Siguiente', color: 'bg-pink-100' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3 rounded font-bold ${item.color} text-sm`}>
              <div>{item.step}</div>
              <div className="text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-sm flow-item">
          <h3 className="font-bold text-slate-800 mb-2">🛠️ Stack</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>✓ Node.js 18+</li>
            <li>✓ PostgreSQL + pgvector</li>
            <li>✓ Claude API</li>
            <li>✓ Zod (validación)</li>
            <li>✓ VitePress (docs)</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-sm flow-item" style={{ animationDelay: '0.1s' }}>
          <h3 className="font-bold text-slate-800 mb-2">📊 Resultado</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>✅ Código trazable</li>
            <li>✅ Tests derivados</li>
            <li>✅ Documentación generada</li>
            <li>✅ Zero ambigüedad</li>
            <li>✅ Reproducible</li>
          </ul>
        </div>
      </div>

      {/* CLI Quick Start */}
      <div className="mt-8 bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto flow-item">
        <div className="text-green-400 font-bold mb-2">$ CLI Workflow</div>
        <pre className="space-y-1">
          <div>{'node cli run-agent designer-front --sketch boceto.png'}</div>
          <div>{'node cli run-agent business-analyst --conversation chat.md'}</div>
          <div>{'node cli reconcile --feature-id "app-1"'}</div>
          <div>{'node cli run-agent requirement-architect --feature-id "app-1"'}</div>
          <div>{'node cli run-agent tdd-engineer --feature-id "app-1"'}</div>
          <div>{'npm test  # RED ✗'}</div>
          <div>{'node cli run-agent implementer --feature-id "app-1"'}</div>
          <div>{'npm test  # GREEN ✅'}</div>
          <div>{'npm run docs:build && git push main'}</div>
        </pre>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-600 border-t pt-4">
        <p>
          📖 Lee <code className="bg-slate-200 px-2 py-1 rounded">TECHNICAL_SUMMARY.md</code> para detalles completos
        </p>
        <p className="mt-2">
          🚀 Punto de partida: <strong>boceto numerado + conversación cliente</strong>
        </p>
      </div>
    </div>
  );
}
