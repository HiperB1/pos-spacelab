import { useState } from 'react';
import { Sparkles, ArrowUp, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { changelog, VersionNota } from '../lib/changelog';

interface Props {
  show: boolean;
  onClose: () => void;
}

function VersionSection({ entry }: { entry: VersionNota }) {
  return (
    <div className="space-y-4">
      {entry.novedades && entry.novedades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Novedades</span>
          </div>
          <ul className="space-y-1.5">
            {entry.novedades.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.mejoras && entry.mejoras.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Mejoras</span>
          </div>
          <ul className="space-y-1.5">
            {entry.mejoras.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.correcciones && entry.correcciones.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Correcciones</span>
          </div>
          <ul className="space-y-1.5">
            {entry.correcciones.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ChangelogModal({ show, onClose }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [latest, ...older] = changelog;

  if (!latest) return null;

  return (
    <Modal show={show} onClose={onClose} showCloseButton={false} size="md">
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Versión {latest.version}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">¿Qué hay de nuevo?</h2>
          <p className="text-sm text-text-muted mt-1">{latest.fecha}</p>
        </div>

        <div className="bg-surface rounded-2xl border border-white/5 p-5">
          <VersionSection entry={latest} />
        </div>

        {older.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors w-full"
            >
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showHistory ? 'Ocultar' : 'Ver'} versiones anteriores
            </button>

            {showHistory && (
              <div className="mt-3 space-y-4">
                {older.map((entry) => (
                  <div key={entry.version} className="bg-surface/50 rounded-2xl border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">v{entry.version}</span>
                      <span className="text-xs text-text-muted">{entry.fecha}</span>
                    </div>
                    <VersionSection entry={entry} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button onClick={onClose} className="w-full">
          ¡Entendido!
        </Button>
      </div>
    </Modal>
  );
}
