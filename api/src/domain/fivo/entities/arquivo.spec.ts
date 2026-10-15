import { Arquivo, TipoArquivo } from './arquivo';

describe('Arquivo', () => {
  it('should create a valid PNG logo file', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.png',
      mime: 'image/png',
      bytes: 1024,
      largura: 1024,
      altura: 1024,
      chaveStorage: 'empresa/logo.png',
    });

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.tipo).toBe(TipoArquivo.LOGO_EMPRESA);
      expect(result.value.mime).toBe('image/png');
      expect(result.value.bytes).toBe(1024);
    }
  });

  it('should create a valid JPG logo file', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.jpg',
      mime: 'image/jpeg',
      bytes: 2048,
      largura: 600,
      altura: 600,
      chaveStorage: 'empresa/logo.jpg',
    });

    expect(result.isRight()).toBe(true);
  });

  it('should create a valid SVG logo file', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'empresa/logo.svg',
      svgConteudo:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
    });

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.svgConteudo).toContain('<svg');
    }
  });

  it('should reject MIME outside the accepted format list', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.gif',
      mime: 'image/gif',
      bytes: 1024,
      largura: 1024,
      altura: 1024,
      chaveStorage: 'empresa/logo.gif',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('formato');
    }
  });

  it('should reject files above 5 MB', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.png',
      mime: 'image/png',
      bytes: 5 * 1024 * 1024 + 1,
      largura: 1024,
      altura: 1024,
      chaveStorage: 'empresa/logo.png',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('tamanho');
    }
  });

  it('should reject raster images smaller than 512x512', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.png',
      mime: 'image/png',
      bytes: 1024,
      largura: 511,
      altura: 511,
      chaveStorage: 'empresa/logo.png',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('dimensão');
    }
  });

  it('should require SVG content when mime is image/svg+xml', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'empresa/logo.svg',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message).toContain('svgConteudo');
    }
  });

  it('should reject SVG with script tag', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'empresa/logo.svg',
      svgConteudo: '<svg><script>alert(1)</script></svg>',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('script');
    }
  });

  it('should reject SVG with foreignObject tag', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'empresa/logo.svg',
      svgConteudo: '<svg><foreignObject><div>bad</div></foreignObject></svg>',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('foreignobject');
    }
  });

  it('should reject SVG with onload attribute', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'empresa/logo.svg',
      svgConteudo: '<svg onload="alert(1)"><circle /></svg>',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('onload');
    }
  });

  it('should accept clean SVG without script or events', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'empresa/logo.svg',
      svgConteudo:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
    });

    expect(result.isRight()).toBe(true);
  });

  it('should accept PDF as institution document', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.DOCUMENTO_INSTITUICAO,
      nomeOriginal: 'documento.pdf',
      mime: 'application/pdf',
      bytes: 1024,
      chaveStorage: 'instituicao/documento.pdf',
    });

    expect(result.isRight()).toBe(true);
  });

  it('should reject PDF as institution logo', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_INSTITUICAO,
      nomeOriginal: 'logo.pdf',
      mime: 'application/pdf',
      bytes: 1024,
      chaveStorage: 'instituicao/logo.pdf',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('formato');
    }
  });

  it('should accept institution document with exactly 10 MB', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.DOCUMENTO_INSTITUICAO,
      nomeOriginal: 'documento.png',
      mime: 'image/png',
      bytes: Buffer.alloc(10 * 1024 * 1024).length,
      largura: 1024,
      altura: 1024,
      chaveStorage: 'instituicao/documento.png',
    });

    expect(result.isRight()).toBe(true);
  });

  it('should reject institution document above 10 MB', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.DOCUMENTO_INSTITUICAO,
      nomeOriginal: 'documento.png',
      mime: 'image/png',
      bytes: Buffer.alloc(10 * 1024 * 1024 + 1).length,
      largura: 1024,
      altura: 1024,
      chaveStorage: 'instituicao/documento.png',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('10 mb');
    }
  });

  it('should accept 300x300 image as institution document', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.DOCUMENTO_INSTITUICAO,
      nomeOriginal: 'documento.png',
      mime: 'image/png',
      bytes: 1024,
      largura: 300,
      altura: 300,
      chaveStorage: 'instituicao/documento.png',
    });

    expect(result.isRight()).toBe(true);
  });

  it('should reject 300x300 image as institution logo', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_INSTITUICAO,
      nomeOriginal: 'logo.png',
      mime: 'image/png',
      bytes: 1024,
      largura: 300,
      altura: 300,
      chaveStorage: 'instituicao/logo.png',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('dimensão');
    }
  });

  it('should cite 5 MB limit for institution logo', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_INSTITUICAO,
      nomeOriginal: 'logo.png',
      mime: 'image/png',
      bytes: 5 * 1024 * 1024 + 1,
      largura: 1024,
      altura: 1024,
      chaveStorage: 'instituicao/logo.png',
    });

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.message.toLowerCase()).toContain('5 mb');
    }
  });

  it('should accept clean SVG as institution logo', () => {
    const result = Arquivo.criar({
      tipo: TipoArquivo.LOGO_INSTITUICAO,
      nomeOriginal: 'logo.svg',
      mime: 'image/svg+xml',
      bytes: 2048,
      chaveStorage: 'instituicao/logo.svg',
      svgConteudo:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
    });

    expect(result.isRight()).toBe(true);
  });
});
