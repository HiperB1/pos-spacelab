import { useState } from 'react';
import { getConfiguracion, updateConfiguracion } from '../lib/facturas';
import { exportDatabaseToJSON, importDatabaseFromJSON, getLastBackupDate } from '../lib/backup';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Save, Download, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ConfiguracionPage() {
  const [config, setConfig] = useState(() => getConfiguracion());
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateConfiguracion({
      prefijo: config.prefijo,
      empresa_nome: config.empresa_nome,
      empresa_nit: config.empresa_nit,
      empresa_direccion: config.empresa_direccion,
      empresa_telefono: config.empresa_telefono,
      empresa_email: config.empresa_email,
      meta_mensual: config.meta_mensual,
      dias_laborables: config.dias_laborables,
      api_key_venndelo: config.api_key_venndelo,
      ciudad_origen: config.ciudad_origen,
      peso_default_kg: config.peso_default_kg
    });
    setConfig(getConfiguracion());
    setSaved(true);
    toast.success('Configuración guardada correctamente');
    setTimeout(() => setSaved(false), 3000);
  }

  function handleExportBackup() {
    exportDatabaseToJSON();
    toast.success('Backup exportado con éxito');
  }

  function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) {
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const result = importDatabaseFromJSON(data);
        if (result.success) {
          toast.success(result.message);
          window.location.reload(); // Reload to reflect major data changes
        } else {
          toast.error(result.message);
        }
      } catch (err) {
        toast.error('Archivo JSON inválido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const lastBackup = getLastBackupDate();

  return (
    <div className="page pb-12">
      <h2>Configuración</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                <h3 className="card-title">Datos Generales</h3>
              </div>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-400 animate-pulse">
                  <CheckCircle className="w-3 h-3" />
                  Cambios Guardados
                </span>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Prefijo de Facturas"
                  value={config.prefijo}
                  onChange={e => setConfig({...config, prefijo: e.target.value})}
                  placeholder="DG-"
                />
                <Input 
                  label="Siguiente Número" 
                  value={config.siguiente_numero} 
                  disabled 
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Datos de la Empresa</h4>
                
                <Input
                  label="Nombre / Razón Social"
                  value={config.empresa_nome}
                  onChange={e => setConfig({...config, empresa_nome: e.target.value})}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="NIT"
                    value={config.empresa_nit}
                    onChange={e => setConfig({...config, empresa_nit: e.target.value})}
                  />
                  <Input
                    label="Dirección"
                    value={config.empresa_direccion}
                    onChange={e => setConfig({...config, empresa_direccion: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Teléfono"
                    value={config.empresa_telefono}
                    onChange={e => setConfig({...config, empresa_telefono: e.target.value})}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={config.empresa_email}
                    onChange={e => setConfig({...config, empresa_email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Metas de Ventas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Meta Mensual (COP)"
                    type="number"
                    value={config.meta_mensual}
                    onChange={e => setConfig({...config, meta_mensual: parseFloat(e.target.value) || 0})}
                  />
                  <Input
                    label="Días Laborables del Mes"
                    type="number"
                    value={config.dias_laborables}
                    onChange={e => setConfig({...config, dias_laborables: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Meta Diaria Calculada</p>
                  <p className="text-xl font-bold text-primary">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format((config.meta_mensual || 0) / (config.dias_laborables || 1))}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Integración Venndelo (Envíos)</h4>
                <p className="text-xs text-white/40">Configura la API de Venndelo para cotizar envíos en las cotizaciones sin cliente.</p>
                <Input
                  label="API Key Venndelo"
                  value={config.api_key_venndelo || ''}
                  onChange={e => setConfig({...config, api_key_venndelo: e.target.value})}
                  placeholder="Ingresa tu API key de Venndelo"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Ciudad Origen (código DANE)"
                    value={config.ciudad_origen || ''}
                    onChange={e => setConfig({...config, ciudad_origen: e.target.value})}
                    placeholder="11001"
                  />
                  <Input
                    label="Peso Default (kg)"
                    type="number"
                    step="0.1"
                    value={config.peso_default_kg || 0.5}
                    onChange={e => setConfig({...config, peso_default_kg: parseFloat(e.target.value) || 0.5})}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full md:w-auto min-w-[200px]">
                  Guardar Configuración
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Backup Section */}
        <div className="space-y-6">
          <div className="card h-full">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                <h3 className="card-title">Mantenimiento</h3>
              </div>
            </div>
            
            <div className="card-body space-y-8">
              <div>
                <p className="text-sm text-text-secondary mb-4">
                  Exporta una copia de seguridad de toda la base de datos local para respaldo o migración.
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full gap-2" 
                  onClick={handleExportBackup}
                >
                  <Download className="w-4 h-4" />
                  Descargar Respaldo JSON
                </Button>
                <p className="text-[10px] text-text-muted mt-2 text-center uppercase tracking-tighter">
                  {lastBackup 
                    ? `Último backup: ${new Date(lastBackup).toLocaleString('es-CO')}`
                    : 'Aún no has exportado datos'}
                </p>
              </div>

              <div className="pt-6 border-t border-white/5">
                <p className="text-sm text-text-secondary mb-4">
                  Verifica que el almacenamiento local esté funcionando correctamente y que tus datos se guarden en el disco.
                </p>
                <Button 
                  variant="ghost" 
                  className="w-full gap-2 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50"
                  onClick={async () => {
                    const { runPersistenceTest } = await import('../lib/testPersistencia');
                    const result = await runPersistenceTest();
                    if (result.success) toast.success(result.message);
                    else toast.error(result.message);
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Ejecutar Test de Persistencia
                </Button>
              </div>

              <div className="pt-6 border-t border-white/5">
                <p className="text-sm text-text-secondary mb-4">
                  Importa un archivo previo. <span className="text-red-400 font-medium">Atención:</span> Esta acción sobrescribirá todos los datos actuales.
                </p>
                <label className="block">
                  <Button 
                    as="div" 
                    variant="ghost" 
                    className="w-full gap-2 border border-dashed border-white/10 hover:border-primary/50"
                    onClick={() => document.getElementById('import-backup-input')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Cargar Archivo
                  </Button>
                  <input 
                    id="import-backup-input" 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportBackup} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}