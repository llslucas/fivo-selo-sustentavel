export interface PartnerCampaign {
  id: string;
  nome: string;
  categoria: string;
  arrecadado: number;
  meta: number;
}

export interface PartnerCompany {
  id: string;
  slug: string;
  name: string;
  corporateName?: string;
  description?: string;
  segment: string;
  initials: string;
  avatarColor: string;
  campaignsCount: number;
  totalDonated: number;
  totalDonatedFormatted: string;
  sealsIssuedCount?: number;
  location?: string;
  memberSince?: string;
  campaigns?: PartnerCampaign[];
}

export const mockPartnerCompanies: PartnerCompany[] = [
  {
    id: "cafe-serra-verde",
    slug: "cafe-serra-verde",
    name: "Café Serra Verde",
    corporateName: "Café Serra Verde Ltda",
    description: "Torrefação e cafeteria especializada, parceira Fivo desde 2025. Apoia projetos de reflorestamento e educação ambiental na região da Serra Verde.",
    segment: "Alimentação",
    initials: "SV",
    avatarColor: "#0F6E56",
    campaignsCount: 4,
    totalDonated: 18400,
    totalDonatedFormatted: "R$ 18,4k",
    sealsIssuedCount: 312,
    location: "São João da Boa Vista, SP",
    memberSince: "2025",
    campaigns: [
      {
        id: "c1",
        nome: "Reflorestar Serra Verde",
        categoria: "Meio ambiente",
        arrecadado: 7200,
        meta: 10000,
      },
      {
        id: "c2",
        nome: "Educação para Todos",
        categoria: "Educação",
        arrecadado: 4500,
        meta: 10000,
      },
      {
        id: "c3",
        nome: "Água Limpa para Todos",
        categoria: "Saneamento",
        arrecadado: 6700,
        meta: 7600,
      },
      {
        id: "c4",
        nome: "Café que alimenta",
        categoria: "Saneamento",
        arrecadado: 6800,
        meta: 10000,
      },
    ],
  },
  {
    id: "rota-tech-solucoes",
    slug: "rota-tech-solucoes",
    name: "Rota Tech Soluções",
    corporateName: "Rota Tech Soluções Tecnológicas Ltda",
    description: "Empresa de desenvolvimento de software e soluções em nuvem que apoia a inclusão digital e capacitação técnica de jovens de baixa renda.",
    segment: "Tecnologia",
    initials: "RT",
    avatarColor: "#3B5998",
    campaignsCount: 2,
    totalDonated: 9100,
    totalDonatedFormatted: "R$ 9,1k",
    sealsIssuedCount: 154,
    location: "São Paulo, SP",
    memberSince: "2025",
    campaigns: [
      {
        id: "rt1",
        nome: "Código do Futuro",
        categoria: "Educação",
        arrecadado: 6100,
        meta: 8000,
      },
      {
        id: "rt2",
        nome: "Inclusão Digital nas Favelas",
        categoria: "Educação",
        arrecadado: 3000,
        meta: 5000,
      },
    ],
  },
  {
    id: "padaria-nova-era",
    slug: "padaria-nova-era",
    name: "Padaria Nova Era",
    corporateName: "Nova Era Panificação e Alimentos Ltda",
    description: "Panificadora tradicional comprometida com a segurança alimentar e combate ao desperdício na comunidade local.",
    segment: "Alimentação",
    initials: "PN",
    avatarColor: "#B94A2D",
    campaignsCount: 3,
    totalDonated: 6700,
    totalDonatedFormatted: "R$ 6,7k",
    sealsIssuedCount: 180,
    location: "Campinas, SP",
    memberSince: "2025",
    campaigns: [
      {
        id: "pn1",
        nome: "Pão de Cada Dia",
        categoria: "Alimentação",
        arrecadado: 3700,
        meta: 5000,
      },
      {
        id: "pn2",
        nome: "Café Solidário Comunitário",
        categoria: "Alimentação",
        arrecadado: 3000,
        meta: 4000,
      },
    ],
  },
  {
    id: "loja-mundo-verde",
    slug: "loja-mundo-verde",
    name: "Loja Mundo Verde",
    corporateName: "Mundo Verde Produtos Sustentáveis S.A.",
    description: "Comércio de produtos naturais, orgânicos e sustentáveis, investindo em cooperativas de agricultura familiar e conservação florestal.",
    segment: "Varejo",
    initials: "LM",
    avatarColor: "#8D6714",
    campaignsCount: 5,
    totalDonated: 22100,
    totalDonatedFormatted: "R$ 22,1k",
    sealsIssuedCount: 420,
    location: "Rio de Janeiro, RJ",
    memberSince: "2024",
    campaigns: [
      {
        id: "lm1",
        nome: "Preservar Florestas",
        categoria: "Meio ambiente",
        arrecadado: 12000,
        meta: 15000,
      },
      {
        id: "lm2",
        nome: "Agroecologia Viva",
        categoria: "Sustentabilidade",
        arrecadado: 10100,
        meta: 12000,
      },
    ],
  },
  {
    id: "ecoclean-servicos",
    slug: "ecoclean-servicos",
    name: "EcoClean Serviços",
    corporateName: "EcoClean Limpeza Sustentável Ltda",
    description: "Serviços especializados em higienização ecológica sem uso de químicos agressivos, destinando parte de cada contrato para despoluição de mananciais.",
    segment: "Serviços",
    initials: "EC",
    avatarColor: "#0E6B56",
    campaignsCount: 1,
    totalDonated: 3200,
    totalDonatedFormatted: "R$ 3,2k",
    sealsIssuedCount: 78,
    location: "Curitiba, PR",
    memberSince: "2026",
    campaigns: [
      {
        id: "ec1",
        nome: "Rios Limpos e Seguros",
        categoria: "Saneamento",
        arrecadado: 3200,
        meta: 5000,
      },
    ],
  },
  {
    id: "barbearia-fina",
    slug: "barbearia-fina",
    name: "Barbearia Fina",
    corporateName: "Barbearia Fina e Estética Masculina",
    description: "Espaço de estética masculina engajado em ações de saúde e bem-estar, apoiando o tratamento do câncer de próstata e saúde mental.",
    segment: "Beleza",
    initials: "BF",
    avatarColor: "#4B6188",
    campaignsCount: 2,
    totalDonated: 5400,
    totalDonatedFormatted: "R$ 5,4k",
    sealsIssuedCount: 95,
    location: "Belo Horizonte, MG",
    memberSince: "2025",
    campaigns: [
      {
        id: "bf1",
        nome: "Novembro Azul e Além",
        categoria: "Saúde",
        arrecadado: 3400,
        meta: 4000,
      },
      {
        id: "bf2",
        nome: "Corte e Autoestima",
        categoria: "Apoio social",
        arrecadado: 2000,
        meta: 3000,
      },
    ],
  },
];
