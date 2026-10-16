import { CSSProperties, useState } from 'react';
import { CallPriority, EmergencyCall } from '../types';
import { createCall, getErrorMessage } from '../services/api';
import { PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../utils/calls';
import { TRIAGE_SIGNALS, suggestPriority } from '../utils/triage';
import { useToast } from './Toast';
import styles from './NewCallForm.module.css';

interface NewCallFormProps {
  onCallCreated: (call: EmergencyCall) => void;
}

// Sinais agrupados pela cor que sugerem (o azul não tem sinal: é escolha do operador)
const SIGNAL_GROUPS = PRIORITIES_BY_SEVERITY
  .map(priority => ({ priority, signals: TRIAGE_SIGNALS.filter(signal => signal.priority === priority) }))
  .filter(group => group.signals.length > 0);

export default function NewCallForm({ onCallCreated }: NewCallFormProps) {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [signals, setSignals] = useState<string[]>([]);
  // Cor escolhida pelo operador; sem escolha, vale a sugerida pelos sinais
  const [chosen, setChosen] = useState<CallPriority | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const suggested = suggestPriority(signals);
  const priority = chosen ?? suggested;
  const milder = !!(priority && suggested && PRIORITY_META[priority].order > PRIORITY_META[suggested].order);

  const toggleSignal = (code: string) =>
    setSignals(current => (current.includes(code) ? current.filter(item => item !== code) : [...current, code]));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!address.trim() || !description.trim()) {
      toast('Preencha a localização e a descrição do chamado.', 'error');
      return;
    }
    if (!priority) {
      toast('Escolha a classificação de risco.', 'error');
      return;
    }

    try {
      setLoading(true);

      const newCall = await createCall({
        age: age ? Number(age) : undefined,
        gender,
        address,
        description,
        priority,
        triage: signals.length > 0 ? { signals, suggested } : undefined
      });

      toast('Chamado criado. Analisando despacho…', 'success');

      setAge('');
      setGender('M');
      setAddress('');
      setDescription('');
      setSignals([]);
      setChosen(null);

      onCallCreated(newCall);
    } catch (error: any) {
      toast(getErrorMessage(error, 'Erro ao criar chamado.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Novo Chamado</h2>

      <p className={styles.intro}>
        Simulação da abertura de chamado por um usuário. O endereço será convertido em coordenadas para aparecer no mapa e entrar no cálculo de distância.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <div>
            <label className={styles.label} htmlFor="call-age">Idade</label>
            <input
              id="call-age"
              type="number"
              inputMode="numeric"
              min="0"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ex: 65"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="call-gender">Sexo</label>
            <select id="call-gender" value={gender} onChange={(e) => setGender(e.target.value)} className={styles.input}>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="OUTRO">Outro / Não informado</option>
            </select>
          </div>
        </div>

        <div>
          <label className={styles.label} htmlFor="call-address">Localização / Endereço</label>
          <input
            id="call-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Rua da Penha, 890 - Sorocaba"
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.label} htmlFor="call-description">O que aconteceu</label>
          <textarea
            id="call-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que está acontecendo com o paciente..."
            rows={4}
            className={styles.input}
          />
        </div>

        <fieldset className={styles.triage}>
          <legend className={styles.label}>Classificação de risco</legend>
          <p className={styles.hint}>Marque os sinais de alerta que quem ligou relatar.</p>

          {SIGNAL_GROUPS.map(group => (
            <div
              key={group.priority}
              className={styles.signalGroup}
              style={{ '--risk-color': PRIORITY_META[group.priority].color, '--risk-on-color': PRIORITY_META[group.priority].onColor } as CSSProperties}
            >
              <span className={styles.groupName}>{PRIORITY_META[group.priority].name}</span>
              <div className={styles.chips}>
                {group.signals.map(signal => (
                  <button
                    key={signal.code}
                    type="button"
                    className={styles.chip}
                    aria-pressed={signals.includes(signal.code)}
                    onClick={() => toggleSignal(signal.code)}
                  >
                    {signal.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className={styles.suggestion} role="status">
            {suggested ? <>Sugerida pelos sinais: <strong>{PRIORITY_META[suggested].name}</strong></> : 'Sem sinais marcados: escolha a cor.'}
          </p>

          <div className={styles.colors} role="radiogroup" aria-label="Classificação de risco">
            {PRIORITIES_BY_SEVERITY.map(option => {
              const meta = PRIORITY_META[option];
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={priority === option}
                  className={styles.color}
                  style={{ '--risk-color': meta.color, '--risk-on-color': meta.onColor } as CSSProperties}
                  onClick={() => setChosen(option)}
                >
                  <strong>{meta.name}</strong>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {milder && <p className={styles.warning}>A cor escolhida é menos grave que a sugerida pelos sinais.</p>}
          <small className={styles.hint}>Classificação inicial — a final é do médico regulador.</small>
        </fieldset>

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? 'Criando chamado...' : 'Abrir Chamado'}
        </button>
      </form>
    </div>
  );
}
