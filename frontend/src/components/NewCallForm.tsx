import { useState } from 'react';
import { CallPriority, EmergencyCall } from '../types';
import { createCall, getErrorMessage } from '../services/api';
import { useToast } from './Toast';
import styles from './NewCallForm.module.css';

interface NewCallFormProps {
  onCallCreated: (call: EmergencyCall) => void;
}

export default function NewCallForm({ onCallCreated }: NewCallFormProps) {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CallPriority>(CallPriority.URGENTE);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!address.trim() || !description.trim()) {
      toast('Preencha a localização e a descrição do chamado.', 'error');
      return;
    }

    try {
      setLoading(true);

      const newCall = await createCall({
        age: age ? Number(age) : undefined,
        gender,
        address,
        description,
        priority
      });

      toast('Chamado criado. Analisando despacho…', 'success');

      setAge('');
      setGender('M');
      setAddress('');
      setDescription('');
      setPriority(CallPriority.URGENTE);

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
        <div>
          <label className={styles.label}>Idade</label>
          <input
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
          <label className={styles.label}>Sexo</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={styles.input}
          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="OUTRO">Outro / Não informado</option>
          </select>
        </div>

        <div>
          <label className={styles.label}>Localização / Endereço</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Rua da Penha, 890 - Sorocaba"
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.label}>Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que está acontecendo com o paciente..."
            rows={4}
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.label}>Urgência</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CallPriority)}
            className={styles.input}
          >
            <option value={CallPriority.EMERGENCIA}>Emergência</option>
            <option value={CallPriority.URGENTE}>Urgente</option>
            <option value={CallPriority.PRIORITARIO}>Prioritário</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? 'Criando chamado...' : 'Abrir Chamado'}
        </button>
      </form>
    </div>
  );
}
