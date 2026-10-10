import { Incident, IncidentSource, IncidentType } from '../types';

const TYPE_LABEL: Record<IncidentType, string> = {
  [IncidentType.ALAGAMENTO]: 'Alagamento',
  [IncidentType.QUEDA_ARVORE]: 'Árvore caída',
  [IncidentType.VIA_BLOQUEADA]: 'Via bloqueada',
  [IncidentType.ACIDENTE]: 'Acidente',
  [IncidentType.VENTOS_FORTES]: 'Ventos fortes',
  [IncidentType.CHUVA_FORTE]: 'Chuva forte',
  [IncidentType.ALERTA_OFICIAL]: 'Alerta oficial'
};

const SOURCE_LABEL: Record<IncidentSource, string> = {
  [IncidentSource.CENTRAL]: 'Central',
  [IncidentSource.EQUIPE]: 'Equipe',
  [IncidentSource.CEMADEN]: 'CEMADEN',
  [IncidentSource.DEFESA_CIVIL]: 'Defesa Civil'
};

// "Alagamento (Equipe USB-01)", para avisos em texto
export function incidentLabel(incident: Pick<Incident, 'type' | 'source' | 'ambulance'>): string {
  const source = incident.source === IncidentSource.EQUIPE && incident.ambulance
    ? `Equipe ${incident.ambulance.code}`
    : SOURCE_LABEL[incident.source] ?? incident.source;
  return `${TYPE_LABEL[incident.type] ?? incident.type} (${source})`;
}
