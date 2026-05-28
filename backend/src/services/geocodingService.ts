import axios from 'axios';
import { Coordinates } from '../types';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const SOROCABA_CENTER: Coordinates = {
  lat: -23.5015,
  lng: -47.4526
};

const demoAddressCoordinates: Array<{ keywords: string[]; coordinates: Coordinates }> = [
  {
    keywords: ['general carneiro'],
    coordinates: { lat: -23.5089, lng: -47.4578 }
  },
  {
    keywords: ['rua aparecida', 'vila hortencia', 'vila hortência'],
    coordinates: { lat: -23.4923, lng: -47.4512 }
  },
  {
    keywords: ['rua da penha', 'jardim vergueiro'],
    coordinates: { lat: -23.5134, lng: -47.4721 }
  },
  {
    keywords: ['campolim'],
    coordinates: { lat: -23.5366, lng: -47.4637 }
  },
  {
    keywords: ['iguatemi esplanada'],
    coordinates: { lat: -23.5362, lng: -47.4646 }
  },
  {
    keywords: ['pao de acucar', 'pão de açúcar', 'avenida sao paulo', 'avenida são paulo'],
    coordinates: { lat: -23.4965, lng: -47.4276 }
  }
];

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getDemoCoordinate(address: string): Coordinates {
  const normalized = normalizeAddress(address);
  const match = demoAddressCoordinates.find(item =>
    item.keywords.some(keyword => normalized.includes(normalizeAddress(keyword)))
  );

  if (match) {
    return match.coordinates;
  }

  // Fallback determinístico perto do centro de Sorocaba para ambientes sem internet.
  // Assim, a demonstração acadêmica continua funcionando mesmo quando o Nominatim não responde.
  const hash = normalized.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const latOffset = ((hash % 80) - 40) / 10000;
  const lngOffset = (((hash * 7) % 80) - 40) / 10000;

  return {
    lat: Number((SOROCABA_CENTER.lat + latOffset).toFixed(6)),
    lng: Number((SOROCABA_CENTER.lng + lngOffset).toFixed(6))
  };
}

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const fullAddress = address.toLowerCase().includes('sorocaba')
    ? address
    : `${address}, Sorocaba, SP, Brasil`;

  try {
    const response = await axios.get<NominatimResult[]>(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: fullAddress,
          format: 'json',
          limit: 1,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'sistema-samu-academico/1.0'
        },
        timeout: 8000
      }
    );

    if (response.data && response.data.length > 0) {
      const result = response.data[0];

      return {
        lat: Number(result.lat),
        lng: Number(result.lon)
      };
    }
  } catch (error) {
    console.warn('Nominatim indisponível. Usando coordenada mockada para demonstração.', error);
  }

  return getDemoCoordinate(address);
}
