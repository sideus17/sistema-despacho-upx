// Foto do perfil: recorta no centro, em quadrado de 256 px, e gera WebP (poucos KB). O Safari não gera
// WebP pelo canvas e devolve PNG, que o bucket também aceita
export async function squarePhoto(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Imagem inválida.'))), 'image/webp', 0.85)
  );
}
