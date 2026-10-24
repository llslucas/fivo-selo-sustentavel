// Validações dos arquivos anexados no cadastro de instituição. Espelham as
// regras da API (POST /instituicoes) pra pessoa descobrir o problema na hora,
// sem esperar o envio; a API continua sendo quem vale de verdade.

const MB = 1024 * 1024;

const TIPOS_DOCUMENTO = ["application/pdf", "image/jpeg", "image/png"];
const TAMANHO_MAXIMO_DOCUMENTO = 10 * MB;

const TIPOS_LOGO = ["image/png", "image/jpeg", "image/svg+xml"];
const TAMANHO_MAXIMO_LOGO = 5 * MB;
const LADO_MINIMO_LOGO = 512;

// Devolve a mensagem de erro, ou null se o arquivo é válido.
export function validarDocumento(arquivo: File): string | null {
  if (!TIPOS_DOCUMENTO.includes(arquivo.type)) {
    return "O documento deve ser um PDF, JPG ou PNG.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) {
    return "O documento deve ter no máximo 10 MB.";
  }
  return null;
}

function lerDimensoes(arquivo: File): Promise<{ largura: number; altura: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ largura: imagem.naturalWidth, altura: imagem.naturalHeight });
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem ilegível"));
    };
    imagem.src = url;
  });
}

// SVG é vetorial, então só os formatos raster (PNG/JPG) têm tamanho mínimo.
export async function validarLogo(arquivo: File): Promise<string | null> {
  if (!TIPOS_LOGO.includes(arquivo.type)) {
    return "A logo deve ser um PNG, JPG ou SVG.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_LOGO) {
    return "A logo deve ter no máximo 5 MB.";
  }
  if (arquivo.type === "image/svg+xml") return null;

  try {
    const { largura, altura } = await lerDimensoes(arquivo);
    if (largura < LADO_MINIMO_LOGO || altura < LADO_MINIMO_LOGO) {
      return `A logo deve ter pelo menos ${LADO_MINIMO_LOGO}×${LADO_MINIMO_LOGO} pixels.`;
    }
  } catch {
    return "Não foi possível ler a imagem da logo.";
  }
  return null;
}