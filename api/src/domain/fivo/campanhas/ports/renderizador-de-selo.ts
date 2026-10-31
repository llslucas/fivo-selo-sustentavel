export interface DadosDoSelo {
  slugEmpresa: string;
  slugCampanha: string;
}

export abstract class RenderizadorDeSelo {
  abstract renderizar(dados: DadosDoSelo): Promise<string>;
}
