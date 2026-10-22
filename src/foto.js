// Foto tirada no celular: reduzida no próprio aparelho antes do envio, em JPEG.
// Guardada no Firestore como texto (data URL), por isso o tamanho é controlado aqui e
// conferido de novo nas regras (até 950 mil caracteres).

export const LADO_MAIOR = 1280;
export const ALVO_FOTO = 450_000; // ~330 KB de JPEG: o que o app tenta alcançar
export const LIMITE_FOTO = 900_000; // acima disso o app recusa (regras: 950 mil)

export function dimensoesReduzidas(largura, altura, ladoMaior = LADO_MAIOR) {
  const escala = Math.min(1, ladoMaior / Math.max(largura, altura));
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) };
}

export const tamanhoAceito = (dataUrl) =>
  typeof dataUrl === 'string' && dataUrl.startsWith('data:image/jpeg;base64,') && dataUrl.length < LIMITE_FOTO;

/**
 * Lê o arquivo da câmera, respeita a rotação da foto (EXIF), reduz e devolve um data URL
 * JPEG. Diminui a qualidade (e, se preciso, o tamanho) até ficar perto do alvo.
 */
export async function reduzirFoto(arquivo) {
  if (!arquivo || !arquivo.type?.startsWith('image/')) {
    throw new Error('Foto: o arquivo escolhido não é uma imagem.');
  }
  let imagem;
  try {
    imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Foto: não foi possível abrir esta imagem. Tente tirar a foto de novo.');
  }
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  let melhor = null;
  for (const lado of [LADO_MAIOR, 1024, 800]) {
    const { largura, altura } = dimensoesReduzidas(imagem.width, imagem.height, lado);
    canvas.width = largura;
    canvas.height = altura;
    contexto.drawImage(imagem, 0, 0, largura, altura);
    for (const qualidade of [0.8, 0.7, 0.6, 0.5]) {
      melhor = canvas.toDataURL('image/jpeg', qualidade);
      if (melhor.length <= ALVO_FOTO) break;
    }
    if (melhor.length <= ALVO_FOTO) break;
  }
  imagem.close?.();
  if (!tamanhoAceito(melhor)) throw new Error('Foto: a imagem ficou grande demais mesmo reduzida. Tente outra foto.');
  return melhor;
}
