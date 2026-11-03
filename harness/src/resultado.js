'use strict';
// Contrato común de resultados (sensores, evaluaciones y modelo de trabajo).
// Un control que no corrió nunca cuenta como aprobado: queda «no_verificado» con su motivo.
//   aprobado      el control corrió y pasó
//   fallido       el control corrió y falló (o el agente/la infraestructura fallaron, ver «causa»)
//   no_verificado no se pudo verificar (timeout, herramienta ausente, sin tiempo, sin línea base…)
//   bloqueado     no se ejecutó por una decisión explícita (presupuesto agotado, falta confirmación)
//   excepcion     falló o no se verificó, pero el usuario autorizó una excepción para esta misma huella

const ESTADOS = ['aprobado', 'fallido', 'no_verificado', 'bloqueado', 'excepcion'];
const CAUSAS = ['agente', 'aceptacion', 'infraestructura', 'presupuesto', 'control'];
const verificado = estado => estado === 'aprobado' || estado === 'excepcion';

/** Identificador estable de un control dentro de un resultado (nombre y módulo). */
const idControl = c => (c.modulo && c.modulo !== '.' ? `${c.nombre}@${c.modulo}` : c.nombre);

/**
 * Estado global de un conjunto de controles. Prioridad: fallido > bloqueado > no_verificado > excepción > aprobado.
 * Un control opcional que falla es un fallo; uno opcional que no corrió solo se informa.
 * Aprobado exige al menos un control aprobado y todos los obligatorios aprobados (o con excepción vigente).
 * @param {{nombre:string, modulo?:string, estado:string, obligatorio?:boolean, motivo?:string}[]} controles
 * @param {{excepciones?: {control:string, huella:string}[], huella?: string}} [o]
 * @returns {{estado:string, motivo:string, controles:object[]}}
 */
function combinar(controles, { excepciones = [], huella = null } = {}) {
  const cs = controles.map(c => {
    if (!ESTADOS.includes(c.estado)) throw new Error(`estado de control inválido: ${c.estado}`);
    if (c.estado === 'aprobado' || c.estado === 'excepcion') return c;
    const exc = huella && excepciones.find(e => e.control === idControl(c) && e.huella === huella);
    return exc ? { ...c, estado: 'excepcion', motivo: `excepción autorizada por el usuario: ${exc.motivo || 'sin motivo'}` } : c;
  });
  const names = st => cs.filter(st).map(idControl).join(', ');
  if (!cs.length) return { estado: 'no_verificado', motivo: 'no corrió ningún control', controles: cs };
  if (cs.some(c => c.estado === 'fallido')) return { estado: 'fallido', motivo: `fallaron: ${names(c => c.estado === 'fallido')}`, controles: cs };
  if (cs.some(c => c.estado === 'bloqueado')) return { estado: 'bloqueado', motivo: `bloqueados: ${names(c => c.estado === 'bloqueado')}`, controles: cs };
  if (cs.some(c => c.obligatorio && c.estado === 'no_verificado')) return { estado: 'no_verificado', motivo: `obligatorios sin verificar: ${names(c => c.obligatorio && c.estado === 'no_verificado')}`, controles: cs };
  if (!cs.some(c => verificado(c.estado))) return { estado: 'no_verificado', motivo: `ningún control se verificó (${names(() => true)})`, controles: cs };
  if (cs.some(c => c.estado === 'excepcion')) return { estado: 'excepcion', motivo: `con excepción: ${names(c => c.estado === 'excepcion')}`, controles: cs };
  const skipped = names(c => c.estado === 'no_verificado');
  return { estado: 'aprobado', motivo: skipped ? `opcionales sin verificar: ${skipped}` : '', controles: cs };
}

const SIMBOLO = { aprobado: '✓', fallido: '✗', no_verificado: '•', bloqueado: '⏸', excepcion: '!' };
const ETIQUETA = { aprobado: 'aprobado', fallido: 'fallido', no_verificado: 'no verificado', bloqueado: 'bloqueado', excepcion: 'excepción autorizada' };

module.exports = { ESTADOS, CAUSAS, verificado, combinar, idControl, SIMBOLO, ETIQUETA };
