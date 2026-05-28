import { useState } from 'react';
import { CallPriority, EmergencyCall } from '../types';
import { createCall } from '../services/api';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!address.trim() || !description.trim()) {
      alert('Preencha a localização e a descrição do chamado.');
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

      alert('Chamado criado com sucesso!');

      setAge('');
      setGender('M');
      setAddress('');
      setDescription('');
      setPriority(CallPriority.URGENTE);

      onCallCreated(newCall);
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Erro ao criar chamado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937'
      }}>
        Novo Chamado
      </h2>

      <p style={{
        margin: '0 0 16px 0',
        fontSize: '13px',
        color: '#6b7280',
        lineHeight: '1.5'
      }}>
        Simulação da abertura de chamado por um usuário. O endereço será convertido em coordenadas para aparecer no mapa e entrar no cálculo de distância.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Idade</label>
          <input
            type="number"
            min="0"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Ex: 65"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Sexo</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={inputStyle}
          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="OUTRO">Outro / Não informado</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Localização / Endereço</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Rua da Penha, 890 - Sorocaba"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que está acontecendo com o paciente..."
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>Urgência</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CallPriority)}
            style={inputStyle}
          >
            <option value={CallPriority.EMERGENCIA}>Emergência</option>
            <option value={CallPriority.URGENTE}>Urgente</option>
            <option value={CallPriority.PRIORITARIO}>Prioritário</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: loading ? '#9ca3af' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Criando chamado...' : 'Abrir Chamado'}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#374151'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: 'white',
  boxSizing: 'border-box'
};
