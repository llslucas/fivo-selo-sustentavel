import {
  DadosDoSelo,
  RenderizadorDeSelo,
} from '@domain/fivo/campanhas/ports/renderizador-de-selo';

export class FakeRenderizadorDeSelo implements RenderizadorDeSelo {
  public chamadas: DadosDoSelo[] = [];

  renderizar(dados: DadosDoSelo): Promise<string> {
    this.chamadas.push(dados);

    return Promise.resolve(
      `<svg data-empresa="${dados.slugEmpresa}" data-campanha="${dados.slugCampanha}"/>`,
    );
  }
}
