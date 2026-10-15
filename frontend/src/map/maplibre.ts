// Configuração única do MapLibre para todos os mapas do app
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// O Vite empacota o worker do MapLibre como arquivo próprio
setWorkerUrl(maplibreWorkerUrl);
