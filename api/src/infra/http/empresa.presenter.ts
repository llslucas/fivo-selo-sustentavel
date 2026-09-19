import { Empresa } from '@domain/fivo/entities/empresa';

export function empresaParaResposta(empresa: Empresa, email: string) {
  return {
    id: empresa.id.toString(),
    razaoSocial: empresa.razaoSocial,
    nomeFantasia: empresa.nomeFantasia,
    cnpj: empresa.cnpj.valor,
    email,
    telefone: empresa.telefone,
    cep: empresa.cep,
    logradouro: empresa.logradouro,
    numero: empresa.numero,
    complemento: empresa.complemento ?? null,
    bairro: empresa.bairro,
    cidade: empresa.cidade,
    uf: empresa.uf,
    site: empresa.site,
    contato: empresa.contato,
    status: empresa.status,
    logoArquivoId: empresa.logoArquivoId?.toString() ?? null,
    criadoEm: empresa.createdAt,
  };
}
