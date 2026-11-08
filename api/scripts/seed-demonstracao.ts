import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

import {
  AlteracaoCampanhaStatus,
  CampanhaStatus,
  CausaStatus,
  EmpresaStatus,
  InstituicaoStatus,
  PrismaClient,
  TipoArquivo,
  TipoRegraDoacao,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';

import { normalizarNomeCausa } from '@infra/database/prisma/mappers/prisma-causa-mapper';

import { backfillSlugs } from '../prisma/scripts/backfill-slugs';

// Cadastros fictícios para demonstração. Idempotente: causa já existente (pelo
// nome), usuário já existente (pelo e-mail) e campanha já existente (empresa +
// nome) são pulados, então rodar de novo não duplica nada. Todos os usuários
// entram com a mesma senha.

const SENHA_DEMO = process.env.SEED_SENHA ?? 'Demo-Fivo-2026';
const STORAGE_DIR = process.env.STORAGE_DIR ?? './tmp/storage';
const DIA_MS = 24 * 60 * 60 * 1000;

const prisma = new PrismaClient();

interface CausaSeed {
  nome: string;
  descricao: string;
  status?: CausaStatus;
}

interface EnderecoSeed {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface DecisaoSeed {
  diasAtras: number;
  diasDecisao?: number;
  motivo?: string;
}

interface EmpresaSeed extends EnderecoSeed, DecisaoSeed {
  razaoSocial: string;
  nomeFantasia: string;
  baseCnpj: string;
  email: string;
  telefone: string;
  site: string;
  contato: string;
  cor: string;
  status: EmpresaStatus;
}

interface InstituicaoSeed extends EnderecoSeed, DecisaoSeed {
  razaoSocial: string;
  nomeFantasia: string;
  baseCnpj: string;
  email: string;
  telefone: string;
  site: string;
  contato: string;
  descricao: string;
  causa: string;
  cor: string;
  status: InstituicaoStatus;
}

const CAUSAS: CausaSeed[] = [
  {
    nome: 'Educação',
    descricao:
      'Acesso à educação de qualidade, reforço escolar e formação de jovens e adultos.',
  },
  {
    nome: 'Meio Ambiente',
    descricao:
      'Preservação de biomas, reflorestamento, reciclagem e educação ambiental.',
  },
  {
    nome: 'Saúde',
    descricao:
      'Apoio a tratamentos, prevenção de doenças e acolhimento de pacientes e famílias.',
  },
  {
    nome: 'Proteção Animal',
    descricao:
      'Resgate, castração, tratamento e adoção responsável de animais.',
  },
  {
    nome: 'Combate à Fome',
    descricao:
      'Distribuição de alimentos, cozinhas comunitárias e segurança alimentar.',
  },
  {
    nome: 'Cultura e Esporte',
    descricao:
      'Projetos culturais e esportivos como ferramenta de inclusão social.',
  },
  {
    nome: 'Inclusão Digital',
    descricao: 'Acesso a equipamentos, internet e formação em tecnologia.',
    status: CausaStatus.INATIVA,
  },
];

const EMPRESAS: EmpresaSeed[] = [
  {
    razaoSocial: 'Verde Vivo Cosméticos Naturais Ltda.',
    nomeFantasia: 'Verde Vivo',
    baseCnpj: '112223330001',
    email: 'contato@verdevivo.demo',
    telefone: '(11) 98765-4321',
    site: 'https://verdevivo.demo',
    contato: 'Mariana Lopes',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Conjunto 81',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    cor: '#2E7D32',
    status: EmpresaStatus.APROVADA,
    diasAtras: 40,
    diasDecisao: 38,
  },
  {
    razaoSocial: 'Café Serra Alta Torrefação S.A.',
    nomeFantasia: 'Café Serra Alta',
    baseCnpj: '223334440001',
    email: 'sustentabilidade@serraalta.demo',
    telefone: '(31) 3222-1100',
    site: 'https://serraalta.demo',
    contato: 'Rafael Mendes',
    cep: '30130-010',
    logradouro: 'Avenida Afonso Pena',
    numero: '1500',
    bairro: 'Centro',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    cor: '#6D4C41',
    status: EmpresaStatus.APROVADA,
    diasAtras: 32,
    diasDecisao: 30,
  },
  {
    razaoSocial: 'Ondas Tecnologia e Serviços Ltda.',
    nomeFantasia: 'Ondas Tech',
    baseCnpj: '334445550001',
    email: 'rh@ondastech.demo',
    telefone: '(48) 99123-4567',
    site: 'https://ondastech.demo',
    contato: 'Juliana Prado',
    cep: '88010-000',
    logradouro: 'Rua Felipe Schmidt',
    numero: '250',
    complemento: 'Sala 402',
    bairro: 'Centro',
    cidade: 'Florianópolis',
    uf: 'SC',
    cor: '#1565C0',
    status: EmpresaStatus.APROVADA,
    diasAtras: 21,
    diasDecisao: 20,
  },
  {
    razaoSocial: 'Pão da Vila Panificadora Ltda.',
    nomeFantasia: 'Pão da Vila',
    baseCnpj: '445556660001',
    email: 'financeiro@paodavila.demo',
    telefone: '(81) 3456-7890',
    site: 'https://paodavila.demo',
    contato: 'Carlos Albuquerque',
    cep: '50030-230',
    logradouro: 'Rua da Aurora',
    numero: '77',
    bairro: 'Boa Vista',
    cidade: 'Recife',
    uf: 'PE',
    cor: '#EF6C00',
    status: EmpresaStatus.PENDENTE_APROVACAO,
    diasAtras: 3,
  },
  {
    razaoSocial: 'Moda Leve Confecções Ltda.',
    nomeFantasia: 'Moda Leve',
    baseCnpj: '556667770001',
    email: 'contato@modaleve.demo',
    telefone: '(41) 99876-5432',
    site: 'https://modaleve.demo',
    contato: 'Fernanda Kowalski',
    cep: '80020-000',
    logradouro: 'Rua XV de Novembro',
    numero: '410',
    bairro: 'Centro',
    cidade: 'Curitiba',
    uf: 'PR',
    cor: '#AD1457',
    status: EmpresaStatus.PENDENTE_APROVACAO,
    diasAtras: 1,
  },
  {
    razaoSocial: 'Construtora Horizonte Ltda.',
    nomeFantasia: 'Horizonte Obras',
    baseCnpj: '667778880001',
    email: 'adm@horizonteobras.demo',
    telefone: '(21) 2233-4455',
    site: 'https://horizonteobras.demo',
    contato: 'Paulo Ribeiro',
    cep: '20040-020',
    logradouro: 'Avenida Rio Branco',
    numero: '120',
    bairro: 'Centro',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    cor: '#546E7A',
    status: EmpresaStatus.REJEITADA,
    diasAtras: 15,
    diasDecisao: 12,
    motivo: 'Cartão CNPJ não confere com a razão social informada.',
  },
  {
    razaoSocial: 'Distribuidora Litoral Ltda.',
    nomeFantasia: 'Litoral Distribuidora',
    baseCnpj: '778889990001',
    email: 'contato@litoraldistribuidora.demo',
    telefone: '(71) 3344-5566',
    site: 'https://litoraldistribuidora.demo',
    contato: 'Bruno Santana',
    cep: '40020-000',
    logradouro: 'Avenida Sete de Setembro',
    numero: '980',
    bairro: 'Dois de Julho',
    cidade: 'Salvador',
    uf: 'BA',
    cor: '#00838F',
    status: EmpresaStatus.SUSPENSA,
    diasAtras: 60,
    diasDecisao: 5,
    motivo: 'Denúncia de uso indevido do selo em material publicitário.',
  },
];

const INSTITUICOES: InstituicaoSeed[] = [
  {
    razaoSocial: 'Associação Aprender Juntos',
    nomeFantasia: 'Aprender Juntos',
    baseCnpj: '123456780001',
    email: 'contato@aprenderjuntos.demo',
    telefone: '(11) 3333-2211',
    site: 'https://aprenderjuntos.demo',
    contato: 'Helena Duarte',
    descricao:
      'Reforço escolar gratuito para 300 crianças da zona leste de São Paulo, com oficinas de leitura e matemática no contraturno.',
    causa: 'Educação',
    cep: '03510-000',
    logradouro: 'Rua Itaquera',
    numero: '455',
    bairro: 'Itaquera',
    cidade: 'São Paulo',
    uf: 'SP',
    cor: '#3949AB',
    status: InstituicaoStatus.APROVADA,
    diasAtras: 45,
    diasDecisao: 43,
  },
  {
    razaoSocial: 'Instituto Raízes da Mata',
    nomeFantasia: 'Raízes da Mata',
    baseCnpj: '234567890001',
    email: 'projetos@raizesdamata.demo',
    telefone: '(27) 99888-7766',
    site: 'https://raizesdamata.demo',
    contato: 'Tiago Vasconcelos',
    descricao:
      'Recuperação de nascentes e plantio de mudas nativas da Mata Atlântica com produtores rurais do Espírito Santo.',
    causa: 'Meio Ambiente',
    cep: '29010-120',
    logradouro: 'Avenida Jerônimo Monteiro',
    numero: '300',
    bairro: 'Centro',
    cidade: 'Vitória',
    uf: 'ES',
    cor: '#2E7D32',
    status: InstituicaoStatus.APROVADA,
    diasAtras: 38,
    diasDecisao: 36,
  },
  {
    razaoSocial: 'Casa de Apoio Esperança',
    nomeFantasia: 'Casa Esperança',
    baseCnpj: '345678900001',
    email: 'acolhimento@casaesperanca.demo',
    telefone: '(62) 3212-4545',
    site: 'https://casaesperanca.demo',
    contato: 'Irmã Lúcia Teixeira',
    descricao:
      'Hospedagem, alimentação e transporte para crianças em tratamento oncológico e seus acompanhantes.',
    causa: 'Saúde',
    cep: '74015-010',
    logradouro: 'Rua 3',
    numero: '880',
    bairro: 'Setor Central',
    cidade: 'Goiânia',
    uf: 'GO',
    cor: '#C62828',
    status: InstituicaoStatus.APROVADA,
    diasAtras: 30,
    diasDecisao: 29,
  },
  {
    razaoSocial: 'Associação Patas Amigas',
    nomeFantasia: 'Patas Amigas',
    baseCnpj: '456789010001',
    email: 'adote@patasamigas.demo',
    telefone: '(51) 99777-1234',
    site: 'https://patasamigas.demo',
    contato: 'Gabriel Schneider',
    descricao:
      'Abrigo com 150 cães e gatos resgatados, mutirões de castração e feiras mensais de adoção em Porto Alegre.',
    causa: 'Proteção Animal',
    cep: '90010-150',
    logradouro: 'Rua dos Andradas',
    numero: '1234',
    bairro: 'Centro Histórico',
    cidade: 'Porto Alegre',
    uf: 'RS',
    cor: '#F9A825',
    status: InstituicaoStatus.APROVADA,
    diasAtras: 25,
    diasDecisao: 24,
  },
  {
    razaoSocial: 'Rede Prato Cheio',
    nomeFantasia: 'Prato Cheio',
    baseCnpj: '567890120001',
    email: 'doacoes@pratocheio.demo',
    telefone: '(85) 3088-9900',
    site: 'https://pratocheio.demo',
    contato: 'Antônia Nogueira',
    descricao:
      'Cozinha comunitária que serve 800 refeições por dia e distribui cestas básicas na periferia de Fortaleza.',
    causa: 'Combate à Fome',
    cep: '60060-000',
    logradouro: 'Avenida Duque de Caxias',
    numero: '560',
    bairro: 'Centro',
    cidade: 'Fortaleza',
    uf: 'CE',
    cor: '#E65100',
    status: InstituicaoStatus.APROVADA,
    diasAtras: 18,
    diasDecisao: 17,
  },
  {
    razaoSocial: 'Instituto Bola pra Frente Comunidade',
    nomeFantasia: 'Bola pra Frente',
    baseCnpj: '678901230001',
    email: 'contato@bolaprafrente.demo',
    telefone: '(21) 98111-2233',
    site: 'https://bolaprafrente.demo',
    contato: 'Marcos Silva',
    descricao:
      'Escolinha de futebol e capoeira para jovens de 7 a 17 anos, com acompanhamento escolar obrigatório.',
    causa: 'Cultura e Esporte',
    cep: '21040-361',
    logradouro: 'Rua Uranos',
    numero: '90',
    bairro: 'Ramos',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    cor: '#00897B',
    status: InstituicaoStatus.PENDENTE_APROVACAO,
    diasAtras: 2,
  },
  {
    razaoSocial: 'Associação Ler é Viver',
    nomeFantasia: 'Ler é Viver',
    baseCnpj: '789012340001',
    email: 'biblioteca@lereviver.demo',
    telefone: '(92) 3622-1010',
    site: 'https://lereviver.demo',
    contato: 'Rosa Amazonas',
    descricao:
      'Bibliotecas comunitárias itinerantes em comunidades ribeirinhas do Amazonas.',
    causa: 'Educação',
    cep: '69005-010',
    logradouro: 'Avenida Eduardo Ribeiro',
    numero: '620',
    bairro: 'Centro',
    cidade: 'Manaus',
    uf: 'AM',
    cor: '#6A1B9A',
    status: InstituicaoStatus.PENDENTE_APROVACAO,
    diasAtras: 1,
  },
  {
    razaoSocial: 'ONG Mar Limpo',
    nomeFantasia: 'Mar Limpo',
    baseCnpj: '890123450001',
    email: 'contato@marlimpo.demo',
    telefone: '(13) 99654-3210',
    site: 'https://marlimpo.demo',
    contato: 'Diego Furtado',
    descricao: 'Mutirões de limpeza de praias no litoral paulista.',
    causa: 'Meio Ambiente',
    cep: '11010-000',
    logradouro: 'Rua XV de Novembro',
    numero: '45',
    bairro: 'Centro',
    cidade: 'Santos',
    uf: 'SP',
    cor: '#0277BD',
    status: InstituicaoStatus.REJEITADA,
    diasAtras: 14,
    diasDecisao: 10,
    motivo:
      'Estatuto social enviado está ilegível; reenvie o documento digitalizado.',
  },
  {
    razaoSocial: 'Associação Sorriso Solidário',
    nomeFantasia: 'Sorriso Solidário',
    baseCnpj: '901234560001',
    email: 'contato@sorrisosolidario.demo',
    telefone: '(61) 3344-7788',
    site: 'https://sorrisosolidario.demo',
    contato: 'Patrícia Moura',
    descricao:
      'Atendimento odontológico gratuito para famílias de baixa renda.',
    causa: 'Saúde',
    cep: '70040-010',
    logradouro: 'SBS Quadra 2',
    numero: '12',
    bairro: 'Asa Sul',
    cidade: 'Brasília',
    uf: 'DF',
    cor: '#5D4037',
    status: InstituicaoStatus.SUSPENSA,
    diasAtras: 50,
    diasDecisao: 6,
    motivo: 'Prestação de contas anual pendente.',
  },
];

/** Completa a base de 12 dígitos com os dígitos verificadores do CNPJ. */
function gerarCnpj(base: string): string {
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, ...pesos1];
  const digito = (numeros: string, pesos: number[]) => {
    const resto =
      numeros.split('').reduce((soma, d, i) => soma + Number(d) * pesos[i], 0) %
      11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = digito(base, pesos1);
  return `${base}${primeiro}${digito(`${base}${primeiro}`, pesos2)}`;
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function logoSvg(nome: string, cor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${cor}"/><text x="256" y="256" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="200" font-weight="700" fill="#FFFFFF">${iniciais(nome)}</text></svg>`;
}

/** PDF de uma página com o título do documento, só para a demonstração. */
function documentoPdf(titulo: string): Buffer {
  const texto = titulo.replace(/[()\\]/g, '');
  const conteudo = `BT /F1 18 Tf 72 720 Td (${texto}) Tj 0 -28 Td /F1 12 Tf (Documento ficticio gerado para demonstracao.) Tj ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

function slug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function salvarArquivo(
  tipo: TipoArquivo,
  nomeOriginal: string,
  mime: string,
  buffer: Buffer,
  svgConteudo?: string,
): Promise<string> {
  const id = randomUUID();
  const chaveStorage = `${randomUUID()}/${nomeOriginal}`;
  const caminho = join(STORAGE_DIR, chaveStorage);

  await mkdir(dirname(caminho), { recursive: true });
  await writeFile(caminho, buffer);
  await prisma.arquivo.create({
    data: {
      id,
      tipo,
      nomeOriginal,
      mime,
      bytes: buffer.length,
      chaveStorage,
      svgConteudo: svgConteudo ?? null,
    },
  });

  return id;
}

async function salvarLogo(
  tipo: TipoArquivo,
  nome: string,
  cor: string,
): Promise<string> {
  const svg = logoSvg(nome, cor);
  return salvarArquivo(
    tipo,
    `logo-${slug(nome)}.svg`,
    'image/svg+xml',
    Buffer.from(svg, 'utf-8'),
    svg,
  );
}

function datas(seed: DecisaoSeed, adminId: string, decidido: boolean) {
  const agora = Date.now();
  const criadoEm = new Date(agora - seed.diasAtras * DIA_MS);

  if (!decidido) {
    return { criadoEm };
  }

  const decididoEm = new Date(agora - (seed.diasDecisao ?? 0) * DIA_MS);
  return {
    criadoEm,
    atualizadoEm: decididoEm,
    decididoEm,
    decididoPor: adminId,
    motivoDecisao: seed.motivo ?? null,
  };
}

async function criarUsuario(
  nome: string,
  email: string,
  role: UserRole,
  senhaHash: string,
  criadoEm: Date,
): Promise<string | null> {
  if (await prisma.usuario.findUnique({ where: { email } })) {
    return null;
  }

  const usuario = await prisma.usuario.create({
    data: { id: randomUUID(), nome, email, senhaHash, role, criadoEm },
  });
  return usuario.id;
}

async function seedCausas(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const causa of CAUSAS) {
    const nomeBusca = normalizarNomeCausa(causa.nome);
    const existente = await prisma.causa.findUnique({ where: { nomeBusca } });
    const registro =
      existente ??
      (await prisma.causa.create({
        data: {
          id: randomUUID(),
          nome: causa.nome,
          nomeBusca,
          descricao: causa.descricao,
          status: causa.status ?? CausaStatus.ATIVA,
          criadoEm: new Date(Date.now() - 60 * DIA_MS),
        },
      }));
    ids.set(causa.nome, registro.id);
  }

  return ids;
}

async function seedEmpresas(adminId: string, senhaHash: string) {
  let criadas = 0;

  for (const e of EMPRESAS) {
    const decisao = datas(
      e,
      adminId,
      e.status !== EmpresaStatus.PENDENTE_APROVACAO,
    );
    const usuarioId = await criarUsuario(
      e.contato,
      e.email,
      UserRole.EMPRESA,
      senhaHash,
      decisao.criadoEm,
    );

    if (!usuarioId) {
      continue;
    }

    const { baseCnpj, email, cor, diasAtras, diasDecisao, motivo, ...dados } =
      e;
    await prisma.empresa.create({
      data: {
        ...dados,
        ...decisao,
        id: randomUUID(),
        usuarioId,
        cnpj: gerarCnpj(baseCnpj),
        logoArquivoId: await salvarLogo(
          TipoArquivo.LOGO_EMPRESA,
          e.nomeFantasia,
          cor,
        ),
      },
    });
    criadas++;
  }

  return criadas;
}

async function seedInstituicoes(
  adminId: string,
  senhaHash: string,
  causas: Map<string, string>,
) {
  let criadas = 0;

  for (const i of INSTITUICOES) {
    const decisao = datas(
      i,
      adminId,
      i.status !== InstituicaoStatus.PENDENTE_APROVACAO,
    );
    const usuarioId = await criarUsuario(
      i.contato,
      i.email,
      UserRole.INSTITUICAO,
      senhaHash,
      decisao.criadoEm,
    );

    if (!usuarioId) {
      continue;
    }

    const {
      baseCnpj,
      email,
      cor,
      causa,
      diasAtras,
      diasDecisao,
      motivo,
      ...dados
    } = i;
    await prisma.instituicao.create({
      data: {
        ...dados,
        ...decisao,
        id: randomUUID(),
        usuarioId,
        cnpj: gerarCnpj(baseCnpj),
        causaId: causas.get(causa)!,
        logoArquivoId: await salvarLogo(
          TipoArquivo.LOGO_INSTITUICAO,
          i.nomeFantasia,
          cor,
        ),
        documentoArquivoId: await salvarArquivo(
          TipoArquivo.DOCUMENTO_INSTITUICAO,
          `estatuto-${slug(i.nomeFantasia)}.pdf`,
          'application/pdf',
          documentoPdf(`Estatuto social - ${i.razaoSocial}`),
        ),
        documentoDescricao: 'Estatuto social registrado em cartório',
      },
    });
    criadas++;
  }

  return criadas;
}

interface CampanhaSeed {
  empresa: string;
  nome: string;
  descricao: string;
  instituicao?: string;
  causa?: string;
  regra:
    | { tipo: 'POR_UNIDADE'; centavos: number }
    | { tipo: 'PERCENTUAL'; centesimos: number };
  metaCentavos?: number;
  /** Dias a partir de hoje (negativo = passado). */
  inicio: number;
  fim?: number;
  cores: [string, string];
  status: CampanhaStatus;
  diasAtras: number;
  diasDecisao?: number;
  motivo?: string;
  /** Pedido de alteração do compromisso aguardando o admin. */
  alteracaoPercentual?: number;
}

const CAMPANHAS: CampanhaSeed[] = [
  {
    empresa: 'Verde Vivo',
    nome: 'Cada frasco planta uma árvore',
    descricao:
      'A cada hidratante da linha Mata Viva vendido, a Verde Vivo doa o valor de uma muda nativa para o Instituto Raízes da Mata recuperar nascentes no Espírito Santo.',
    instituicao: 'Raízes da Mata',
    regra: { tipo: 'POR_UNIDADE', centavos: 200 },
    metaCentavos: 5_000_000,
    inicio: -30,
    fim: 150,
    cores: ['#1B5E20', '#81C784'],
    status: CampanhaStatus.APROVADA,
    diasAtras: 36,
    diasDecisao: 31,
  },
  {
    empresa: 'Verde Vivo',
    nome: 'Beleza que acolhe',
    descricao:
      'Parte do faturamento dos kits de presente vai para a Casa Esperança, que hospeda crianças em tratamento oncológico e suas famílias.',
    instituicao: 'Casa Esperança',
    regra: { tipo: 'PERCENTUAL', centesimos: 500 },
    metaCentavos: 2_000_000,
    inicio: -10,
    fim: 80,
    cores: ['#B71C1C', '#F48FB1'],
    status: CampanhaStatus.APROVADA,
    diasAtras: 14,
    diasDecisao: 11,
    alteracaoPercentual: 700,
  },
  {
    empresa: 'Verde Vivo',
    nome: 'Linha Pet Natural',
    descricao:
      'Shampoos veganos para cães e gatos: cada unidade vendida ajuda a custear castrações da Patas Amigas.',
    instituicao: 'Patas Amigas',
    regra: { tipo: 'POR_UNIDADE', centavos: 150 },
    inicio: 20,
    fim: 120,
    cores: ['#F57F17', '#FFE082'],
    status: CampanhaStatus.RASCUNHO,
    diasAtras: 2,
  },
  {
    empresa: 'Café Serra Alta',
    nome: 'Café que alimenta',
    descricao:
      'Cada pacote de 500 g do blend Serra Alta Solidário garante R$ 1,00 para a cozinha comunitária da Rede Prato Cheio, em Fortaleza.',
    instituicao: 'Prato Cheio',
    regra: { tipo: 'POR_UNIDADE', centavos: 100 },
    metaCentavos: 3_000_000,
    inicio: -20,
    fim: 100,
    cores: ['#4E342E', '#D7A86E'],
    status: CampanhaStatus.APROVADA,
    diasAtras: 25,
    diasDecisao: 21,
  },
  {
    empresa: 'Café Serra Alta',
    nome: 'Safra Solidária 2026',
    descricao:
      'Durante a safra, 3% das vendas da linha de microlotes vão para projetos de educação nas comunidades produtoras.',
    causa: 'Educação',
    regra: { tipo: 'PERCENTUAL', centesimos: 300 },
    inicio: 5,
    fim: 95,
    cores: ['#33691E', '#C5E1A5'],
    status: CampanhaStatus.EM_ANALISE,
    diasAtras: 3,
  },
  {
    empresa: 'Café Serra Alta',
    nome: 'Natal sem fome',
    descricao:
      'Nas cestas de Natal, uma parte do valor vira cestas básicas para famílias em situação de insegurança alimentar.',
    causa: 'Combate à Fome',
    regra: { tipo: 'PERCENTUAL', centesimos: 1000 },
    inicio: 15,
    fim: 50,
    cores: ['#C62828', '#FFCDD2'],
    status: CampanhaStatus.REJEITADA,
    diasAtras: 9,
    diasDecisao: 6,
    motivo:
      'A descrição não informa como a doação será comprovada nem quem receberá as cestas.',
  },
  {
    empresa: 'Ondas Tech',
    nome: 'Código do Futuro',
    descricao:
      '2% de cada contrato de suporte firmado viram bolsas de reforço escolar e oficinas de programação na Associação Aprender Juntos.',
    instituicao: 'Aprender Juntos',
    regra: { tipo: 'PERCENTUAL', centesimos: 200 },
    inicio: -15,
    cores: ['#0D47A1', '#64B5F6'],
    status: CampanhaStatus.APROVADA,
    diasAtras: 19,
    diasDecisao: 16,
  },
  {
    empresa: 'Ondas Tech',
    nome: 'Volta às aulas conectada',
    descricao:
      'Campanha de início de ano: cada notebook recondicionado vendido doou R$ 50,00 para material escolar.',
    instituicao: 'Aprender Juntos',
    regra: { tipo: 'POR_UNIDADE', centavos: 5000 },
    metaCentavos: 1_000_000,
    inicio: -90,
    fim: -30,
    cores: ['#283593', '#9FA8DA'],
    status: CampanhaStatus.APROVADA,
    diasAtras: 100,
    diasDecisao: 95,
  },
  {
    empresa: 'Ondas Tech',
    nome: 'Bit Verde',
    descricao:
      'Para cada equipamento antigo recolhido para reciclagem correta, a Ondas Tech doa R$ 0,50 para projetos de meio ambiente.',
    causa: 'Meio Ambiente',
    regra: { tipo: 'POR_UNIDADE', centavos: 50 },
    inicio: 7,
    cores: ['#00695C', '#80CBC4'],
    status: CampanhaStatus.EM_ANALISE,
    diasAtras: 1,
  },
];

const CRC_TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABELA[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function rgb(cor: string): [number, number, number] {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Capa PNG 1200x630 com degradê diagonal entre as duas cores. */
function capaPng([de, para]: [string, string]): Buffer {
  const largura = 1200;
  const altura = 630;
  const [r1, g1, b1] = rgb(de);
  const [r2, g2, b2] = rgb(para);
  const linha = 1 + largura * 3;
  const bruto = Buffer.alloc(linha * altura);

  for (let y = 0; y < altura; y++) {
    bruto[y * linha] = 0;
    for (let x = 0; x < largura; x++) {
      const t = (x / largura + y / altura) / 2;
      const i = y * linha + 1 + x * 3;
      bruto[i] = Math.round(r1 + (r2 - r1) * t);
      bruto[i + 1] = Math.round(g1 + (g2 - g1) * t);
      bruto[i + 2] = Math.round(b1 + (b2 - b1) * t);
    }
  }

  const bloco = (tipo: string, dados: Buffer) => {
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(corpo));
    return Buffer.concat([tamanho, corpo, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(bruto)),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

/** Data de calendário (meia-noite UTC) a `dias` de hoje. */
function dataCalendario(dias: number): Date {
  const hoje = new Date();
  return new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()) +
      dias * DIA_MS,
  );
}

async function seedCampanhas(
  adminId: string,
  causas: Map<string, string>,
): Promise<number> {
  const empresaPorNome = new Map(
    EMPRESAS.map((e) => [e.nomeFantasia, gerarCnpj(e.baseCnpj)]),
  );
  const instituicaoPorNome = new Map(
    INSTITUICOES.map((i) => [i.nomeFantasia, gerarCnpj(i.baseCnpj)]),
  );
  let criadas = 0;

  for (const c of CAMPANHAS) {
    const empresa = await prisma.empresa.findUnique({
      where: { cnpj: empresaPorNome.get(c.empresa)! },
    });

    if (
      !empresa ||
      (await prisma.campanha.findFirst({
        where: { empresaId: empresa.id, nome: c.nome },
      }))
    ) {
      continue;
    }

    const instituicao = c.instituicao
      ? await prisma.instituicao.findUnique({
          where: { cnpj: instituicaoPorNome.get(c.instituicao)! },
        })
      : null;
    const regra = {
      regraTipo: TipoRegraDoacao[c.regra.tipo],
      regraValorCentavos:
        c.regra.tipo === 'POR_UNIDADE' ? c.regra.centavos : null,
      regraPercentualCentesimos:
        c.regra.tipo === 'PERCENTUAL' ? c.regra.centesimos : null,
    };
    const beneficiada = {
      instituicaoId: instituicao?.id ?? null,
      causaId: c.causa ? causas.get(c.causa)! : null,
    };
    const vigencia = {
      dataInicio: dataCalendario(c.inicio),
      dataFim: c.fim === undefined ? null : dataCalendario(c.fim),
    };
    const criadoEm = new Date(Date.now() - c.diasAtras * DIA_MS);
    const submetida = c.status !== CampanhaStatus.RASCUNHO;
    const decidida =
      c.status === CampanhaStatus.APROVADA ||
      c.status === CampanhaStatus.REJEITADA;
    const decididoEm = decidida
      ? new Date(Date.now() - (c.diasDecisao ?? 0) * DIA_MS)
      : null;
    const campanhaId = randomUUID();

    await prisma.campanha.create({
      data: {
        id: campanhaId,
        idPublico: randomUUID(),
        empresaId: empresa.id,
        nome: c.nome,
        descricao: c.descricao,
        capaArquivoId: await salvarArquivo(
          TipoArquivo.IMAGEM_CAMPANHA,
          `capa-${slug(c.nome)}.png`,
          'image/png',
          capaPng(c.cores),
        ),
        ...beneficiada,
        ...regra,
        ...vigencia,
        metaCentavos: c.metaCentavos ?? null,
        status: c.status,
        submetidaEm: submetida
          ? new Date(criadoEm.getTime() + DIA_MS / 2)
          : null,
        decididoPor: decidida ? adminId : null,
        decididoEm,
        motivoUltimaRejeicao: c.motivo ?? null,
        criadoEm,
        atualizadoEm: decididoEm,
      },
    });

    if (c.alteracaoPercentual !== undefined) {
      await prisma.campanhaAlteracao.create({
        data: {
          id: randomUUID(),
          campanhaId,
          ...beneficiada,
          regraTipo: TipoRegraDoacao.PERCENTUAL,
          regraPercentualCentesimos: c.alteracaoPercentual,
          ...vigencia,
          status: AlteracaoCampanhaStatus.EM_ANALISE,
          criadoEm: new Date(Date.now() - DIA_MS),
        },
      });
    }

    criadas++;
  }

  return criadas;
}

async function seed(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const admin = adminEmail
    ? await prisma.usuario.findUnique({ where: { email: adminEmail } })
    : await prisma.usuario.findFirst({ where: { role: UserRole.ADMIN } });

  if (!admin) {
    throw new Error(
      'Nenhum ADMIN encontrado: suba a API uma vez com ADMIN_EMAIL/ADMIN_SENHA antes do seed.',
    );
  }

  const senhaHash = await argon2.hash(SENHA_DEMO, { type: argon2.argon2id });
  const causas = await seedCausas();
  const empresas = await seedEmpresas(admin.id, senhaHash);
  const instituicoes = await seedInstituicoes(admin.id, senhaHash, causas);
  const campanhas = await seedCampanhas(admin.id, causas);
  // Empresas aprovadas/suspensas e campanhas aprovadas precisam de slug para a
  // vitrine pública.
  await backfillSlugs(prisma);

  console.log(
    `Seed concluído: ${causas.size} causas, ${empresas} empresas, ${instituicoes} instituições e ${campanhas} campanhas novas.`,
  );
  console.log(`Senha de todos os usuários de demonstração: ${SENHA_DEMO}`);
}

seed()
  .then(() => prisma.$disconnect())
  .then(
    () => process.exit(0),
    async (erro: unknown) => {
      console.error(erro);
      await prisma.$disconnect();
      process.exit(1);
    },
  );
