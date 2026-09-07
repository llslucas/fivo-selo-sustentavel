# Cadastro e Autenticação de Empresa Design

**Spec**: `.specs/features/cadastro-empresa/spec.md`
**Status**: Approved (2026-09-07)

> Convenção: palavras-chave e nomes de seção em inglês, conteúdo em português (AD-005).
> Reescrito em 2026-09-07 para a arquitetura de **AD-017** (hexagonal completa, contexto único `src/domain/fivo/`), substituindo o design anterior baseado em AD-011.

---

## Escopo deste design

`cadastro-empresa` cobre a identidade e o ciclo de vida da **empresa** e o **mecanismo de autenticação** compartilhado pelos três papéis (`EMPRESA`, `INSTITUICAO`, `ADMIN`). Concretamente:

1. **Autocadastro da empresa** — `usuario` (papel `EMPRESA`) + perfil `empresa` criados juntos, estado inicial `PENDENTE_APROVACAO`, logo opcional, e-mail de confirmação.
2. **Fila e decisão de aprovação** pelo administrador — máquina de estados + log de auditoria imutável.
3. **Autenticação e sessão** — login por e-mail/senha, sessão opaca em `sessao` (AD-012), bloqueio por tentativas, expiração por inatividade.
4. **Manutenção cadastral** (P2), **recuperação de senha** (P2), **suspensão/reativação** (P3).

**Fora deste design** (decisão do usuário, 2026-09-07): o perfil e o autocadastro da **instituição** e tudo de **campanha** — os casos de uso `criar-instituicao`, `*-instituicao` e `criar-campanha` já presentes em `src/domain/fivo/` pertencem a `catalogo-instituicoes` e `campanhas` e serão especificados por lá. Este design só governa `User`, `Empresa`, `Cnpj` e as portas de autenticação/persistência que a empresa usa.

**Front-end (`web`)**: descrito só em nível de rotas; o detalhamento de telas é uma rodada de tasks separada.

---

## Approach

A arquitetura **não é uma escolha em aberto**: o usuário já a definiu e commitou (`d50cbac`), e ela está registrada em **AD-017**. Este design documenta a forma escolhida e mapeia a distância entre o que existe na branch `feat/new-arch` e o que a spec exige.

| Decisão | Escolha | Origem |
| ------- | ------- | ------ |
| Estilo de arquitetura | Hexagonal completa: entidades ricas, portas `abstract class`, **um caso de uso por operação**, adaptadores na infra | AD-017 (supersede AD-011) |
| Onde mora a regra | **Rich domain model**: invariante de entidade → método nela; valor restrito → value object; regra entre registros → caso de uso. Nada de regra pura solta em `application/` | decisão do usuário 2026-09-07 (nota em AD-017) |
| Organização do código | Contexto único `src/domain/fivo/` (não um domínio por feature) | AD-017 (emenda AD-001/AD-010) |
| Fonte da verdade do modelo | Entidades TypeScript em `src/domain/fivo/entities/` (code-first) | AD-017 (emenda AD-006) |
| Persistência | Portas de repositório + **repositórios em memória nos testes**; adaptador Prisma/Postgres numa **fase de infra posterior** | AD-014 (adiada por AD-017), resposta do usuário 2026-09-07 |
| Sessão | Token opaco de 256 bits em `sessao`, cookie httpOnly, validado a cada request | AD-012 (mantida) |
| Ordem de trabalho | Fechar todas as **regras de negócio** (domínio, testável só com fakes) antes de construir a infra | AD-017 |

---

## Architecture Overview

Três anéis (AD-017). A regra de ESLint (`api/eslint.config.mjs`) impõe as fronteiras: `src/core/**` só aceita import relativo e `node:*`; `src/domain/**` não importa `@infra/*`, `@prisma/*`, `express` nem `@nestjs/platform-express` (mas **pode** importar `@nestjs/common` para `@Injectable`/`@Inject`).

```mermaid
graph TD
    subgraph web [web / NextJS - rodada de tasks futura]
        FormCad[/cadastro/empresa/]
        Login[/login/]
        AreaEmp[/app - área da empresa/]
        Painel[/admin/empresas/]
    end

    subgraph infra [api / src/infra - Nest - FASE DE INFRA POSTERIOR]
        direction TB
        Ctrl[Controllers HTTP + DTOs zod]
        Filter[DomainExceptionFilter - UseCaseError.status → HTTP]
        Guard[AuthGuard + RolesGuard]
        SessSvc[SessionService]
        PrismaAd[Adaptadores Prisma das portas + mappers]
        Argon[Argon2Hasher / OpaqueTokenEncrypter]
        MailAd[LogMailer]
        StoreAd[LocalDiskStorage + ArquivoService]
    end

    subgraph domain [api / src/domain/fivo - REGRA DE NEGÓCIO - existe hoje, precisa de retrabalho]
        direction TB
        subgraph ents [entities - a regra vive aqui]
            Emp["Empresa + aprovar/rejeitar/suspender/reativar/estaAprovada"]
            Usr["User + registrarFalhaDeLogin/estaBloqueado/registrarLoginOk"]
            Cnpj["Cnpj.create (VO)"]
            SenhaVO["Senha.criar (VO)"]
            Arq["Arquivo.criar (factory validante por tipo)"]
        end
        subgraph uc [application/use-cases - só orquestração]
            CriarEmp[CriarEmpresaUseCase]
            Auth[AutenticarUsuarioUseCase]
            Decidir[Aprovar/Rejeitar/Suspender/Reativar + ListarFila]
            EditEmp[EditarDadosEmpresaUseCase - P2]
            SenhaUC[Solicitar/RedefinirSenhaUseCase - P2]
        end
        subgraph ports [application/ports]
            RepoE[EmpresaRepository]
            RepoU[UserRepository]
            RepoS[SessaoRepository]
            RepoAud[RegistroAuditoriaRepository]
            RepoTok[TokenSenhaRepository]
            Hasher[Hasher]
            Mailer[Mailer]
            Storage[Storage]
        end
    end

    subgraph core [api / src/core - kernel - existe, não muda]
        Either[Either / left / right]
        Entity[Entity / ValueObject / UniqueEntityId]
        Errs[NotAllowedError / ResourceNotFoundError / UseCaseError]
    end

    subgraph testdbl [api/test - test doubles - existe]
        InMem[InMemory*Repository]
        Fakes[FakeHasher / FakeEncrypter]
        Fact[*Factory]
    end

    FormCad & Login & AreaEmp & Painel --> Ctrl
    Ctrl --> Guard --> SessSvc
    Ctrl --> CriarEmp & Auth & Decidir & EditEmp & SenhaUC
    CriarEmp --> Cnpj & SenhaVO & RepoU & RepoE & Hasher & Mailer
    Auth --> Usr & RepoU & Hasher & RepoS
    Decidir --> Emp & RepoE & RepoAud & Mailer
    EditEmp --> Emp & RepoE & Mailer
    SenhaUC --> SenhaVO & RepoU & RepoTok & RepoS & Hasher & Mailer
    StoreAd --> Arq
    RepoE & RepoU & RepoS & RepoAud & RepoTok -.impl.- PrismaAd
    RepoE & RepoU -.impl. testes.- InMem
    Hasher -.impl.- Argon
    Hasher -.impl. testes.- Fakes
    Mailer -.impl.- MailAd
    Storage -.impl.- StoreAd
    CriarEmp & Auth & Decidir --> Either
    ents --> Entity
```

**Fluxo de uma requisição autenticada (fase de infra):** cookie `sessao` → `AuthGuard` → `SessionService.validar` (lê `sessao` por `sha256` do token, checa `revogadaEm` e `ultimoAcessoEm + 8h`, desliza `ultimoAcessoEm`) → injeta `request.user` → `RolesGuard` compara com `@Roles(...)` → controller → caso de uso.

**Fluxo hoje (só domínio):** o teste instancia o caso de uso com `InMemory*Repository` + `FakeHasher` e afirma sobre o `Either` retornado e sobre o estado do repositório em memória. As regras de negócio (transições da `Empresa`, bloqueio do `User`, validação de `Cnpj`/`Senha`/`Arquivo`) têm testes próprios em `entities/*.spec.ts`, sem montar o caso de uso.

**Onde mora a regra (rich domain model):** invariante de uma entidade → método nela (`empresa.aprovar()`, `user.registrarFalhaDeLogin(agora)`); valor restrito sem identidade → value object com `create`/`criar` devolvendo `Either` (`Cnpj`, `Senha`); construção de entidade com identidade e validação → factory `Arquivo.criar`. O caso de uso nunca contém a regra — só carrega, chama o método/factory, e persiste. Regra que cruza registros (unicidade de CNPJ) fica no caso de uso, que consulta o repositório.

---

## As-built vs. planejado

| Camada | Existe hoje (`feat/new-arch`) | Falta |
| ------ | ---------------------------- | ----- |
| `src/core/` | `Either`, `Entity`, `ValueObject`, `UniqueEntityId`, `Optional`, `UseCaseError`, `NotAllowedError`, `ResourceNotFoundError` | nada — kernel estável |
| `entities/` | `Cnpj` (VO), `User` (+`UserRole`), `Empresa` (+`EmpresaStatus`) — hoje com setters públicos e sem regra | `Senha` VO; `Arquivo` (entidade + factory validante); métodos de transição em `Empresa` (e remover setters); métodos de bloqueio + `Senha` em `User` |
| `application/ports/` | `Hasher`, `Encrypter`, `EmpresaRepository`, `UserRepository` | `SessaoRepository`, `RegistroAuditoriaRepository`, `TokenSenhaRepository`, `Mailer`, `Storage`; `EmpresaRepository.listarPorEstado`. `Encrypter` sai do fluxo de login (AD-012) |
| `application/use-cases/` | `CriarEmpresaUseCase`, `CriarUsuarioUseCase`, `AuthenticateUserUseCase`, `Aprovar/Rejeitar/SuspenderEmpresaUseCase` | retrabalho de todos (ver §Risks) — passam a **só orquestrar**, delegando a regra à entidade/VO; `ReativarEmpresaUseCase`, `ListarFilaAprovacaoUseCase`, `AssegurarEmpresaAprovadaUseCase`, `EditarDadosEmpresaUseCase`, `SolicitarRecuperacaoSenhaUseCase`, `RedefinirSenhaUseCase` |
| `test/` | `InMemoryEmpresaRepository`, `InMemoryUserRepository`, `FakeHasher`, `FakeEncrypter`, factories de `Empresa`/`User` | in-memory dos novos repos, `FakeMailer`/`FakeStorage`; harness e2e |
| `src/infra/` | stubs vazios (`AppModule`, `Database/Cryptography/Auth/HttpModule`, `prisma.service.ts` vazio) | **tudo** — fase de infra |

---

## Code Reuse Analysis

### Componentes existentes a aproveitar

| Componente | Localização | Como usar |
| ---------- | ----------- | --------- |
| `Either` / `left` / `right` | `api/src/core/either.ts` | Retorno de todo caso de uso que possa falhar por regra de negócio |
| `Entity<Props>` / `ValueObject<Props>` / `UniqueEntityId` | `api/src/core/types/entities/` | Base das entidades e do `Cnpj` |
| `UseCaseError` (interface `{ message: string }`) | `api/src/core/types/use-case-error.ts` | Contrato de todo erro de aplicação; adaptar para carregar `status` de forma consistente (ver Risks) |
| `NotAllowedError` / `ResourceNotFoundError` | `api/src/core/errors/` | Erros de autorização (403) e recurso ausente (404) |
| `Cnpj` VO | `api/src/domain/fivo/entities/cnpj.ts` | Validação de 14 dígitos + DV; já pronto, falta cobertura de teste |
| `EmpresaRepository` / `UserRepository` (portas) | `api/src/domain/fivo/application/ports/database/` | Contrato de persistência; estender com métodos que faltam (`findByEmail` em `EmpresaRepository`? não — e-mail é do `User`) |
| `Hasher` / `Encrypter` (portas) | `api/src/domain/fivo/application/ports/cryptography/` | `Hasher` para senha; `Encrypter` a reavaliar (ver Risks — sessão opaca não é "encrypt payload") |
| `InMemory*Repository`, `FakeHasher`, `FakeEncrypter` | `api/test/` | Test doubles das portas; padrão a repetir nos novos repos |
| `EmpresaFactory` / `UserFactory` | `api/test/factories/` | Montagem de entidades nos testes |
| Regra de fronteira do ESLint | `api/eslint.config.mjs` | Já barra `@infra/*`/`@prisma/*` em `src/domain/**`; não precisa mudar |
| Aliases `@core` / `@domain` / `@infra` / `@test` | `api/tsconfig.json` + `jest.moduleNameMapper` | Imports entre anéis |

### Novas dependências (entram na fase de infra, não agora)

| Pacote | Uso | Nota |
| ------ | --- | ---- |
| `prisma` (dev) + `@prisma/client` | ORM / migrations | schema derivado das entidades |
| `argon2` (ou `bcrypt`) | Adaptador de `Hasher` | binário nativo — confirmar build no alvo (Knowledge Verification Chain) |
| `cookie-parser` | Ler o cookie `sessao` | — |
| `zod` (já instalado) | DTOs de entrada + `ZodValidationPipe` | — |
| lib de sniff de imagem / dimensão | `Storage`/`ArquivoService` — magic bytes + 512×512 | escolher na task; a lista de formatos é fechada (PNG/JPG/SVG) |

### Integration points

| Sistema | Integração |
| ------- | ---------- |
| `catalogo-instituicoes` | Reusa `UserRepository`, `Hasher`, `SessaoRepository`, `RegistroAuditoriaRepository`, `Mailer`, `Storage` e o mecanismo de sessão; cria `Instituicao` 1‑1 com `User` (papel `INSTITUICAO`) |
| `campanhas`, `selo-e-qrcode` | Chamam uma verificação `empresaAprovada(empresaId)` (403 "Cadastro ainda não aprovado") antes de criar campanha/selo |
| `paginas-publicas` | Lê campos públicos de `Empresa`; `EmpresaStatus.SUSPENSA` derruba as páginas das campanhas |
| painel admin (`web`) | Consome os endpoints de fila/decisão de `AdminEmpresasController` |

---

## Components

### Domínio — `api/src/domain/fivo/`

#### Entities

##### `Cnpj` (value object) — existe

- **Location**: `entities/cnpj.ts`
- **Interfaces**: `static create(bruto: string): Either<InvalidCnpjError, Cnpj>` (remove máscara, valida 14 dígitos + DV); `get valor(): string`
- **Estado**: pronto. Falta um `*.spec.ts` dedicado cobrindo cada ramo de EMP-02 AC2.

##### `Senha` (value object) — novo

- **Location**: `entities/senha.ts`
- **Interfaces**: `static criar(raw: string): Either<SenhaFracaError, Senha>` (mínimo 10 caracteres — EMP-02 AC4; a spec não pede mais); `get valor(): string`
- **Reuses**: `ValueObject`, `Either`. Mesmo padrão do `Cnpj`. O texto claro só circula do VO até o `Hasher`.

##### `User` (entity) — existe, estender + regra

- **Location**: `entities/user.ts`
- **Props hoje**: `nome, email, senha, role (UserRole ADMIN|EMPRESA|INSTITUICAO), empresa?, createdAt, updatedAt?`
- **Mudanças**:
  - `senha` passa a ser `Senha` (VO), não `string`
  - adicionar `falhasLogin: number`, `primeiraFalhaEm: Date | null`, `bloqueadoAte: Date | null`
  - **métodos de bloqueio** (a regra de EMP-07 AC3 mora aqui): `registrarFalhaDeLogin(agora: Date): void` (reinicia a janela se a 1ª falha tem > 15 min; na 5ª dentro da janela seta `bloqueadoAte = agora + 15min`), `estaBloqueado(agora: Date): boolean`, `registrarLoginOk(): void`. O "agora" entra como parâmetro — o método continua puro, sem relógio interno.
- **Reuses**: `Entity`, `UniqueEntityId`, `Optional`, `Senha`

##### `Empresa` (entity) — existe, modelo + máquina de estados

- **Location**: `entities/empresa.ts`
- **Props**: `usuarioId: UniqueEntityId` (novo — vínculo 1‑1, AD-013), `razaoSocial, nomeFantasia, cnpj: Cnpj, telefone, cep, logradouro, numero: string` (era `number`)`, complemento?, bairro, cidade, uf, site, contato, logoArquivoId?` (novo)`, status: EstadoEmpresa, decididoPor?, decididoEm?, motivoDecisao?, emailPendente?, tokenTrocaEmailHash?` (novos — P2)`, createdAt, updatedAt?`. **Remover** `email` — o e-mail de login é do `User`.
- **Máquina de estados como método** (a regra de EMP-05 AC5 mora aqui; **remover os setters públicos** de `status`/`decidido_*`):
  - `aprovar(adminId): Either<TransicaoInvalidaError, void>` — só de `PENDENTE_APROVACAO`
  - `rejeitar(adminId, motivo): Either<TransicaoInvalidaError | MotivoInsuficienteError, void>` — só de `PENDENTE_APROVACAO`, `motivo.length >= 20` (senão 422)
  - `suspender(adminId): Either<...>` — só de `APROVADA`
  - `reativar(adminId): Either<...>` — só de `SUSPENSA`
  - `estaAprovada(): boolean`
  - Toda transição fora do conjunto → `Left(TransicaoInvalidaError)` (status 409). Transição válida aplica `status` + `decididoPor` + `decididoEm` (+ `motivoDecisao`).

##### `Arquivo` (entity) — novo

- **Location**: `entities/arquivo.ts`
- **Interfaces**: `static criar(input: { tipo: TipoArquivo; nomeOriginal; mime; bytes; largura?; altura?; chaveStorage; svgConteudo? }): Either<ArquivoInvalidoError, Arquivo>`
- **Regra dentro do factory** (EMP-03 AC5/AC6): formatos aceitos **por `tipo`** (`LOGO_EMPRESA` → png/jpg/svg); ≤ 5 MB; raster ≥ 512×512; se `mime === 'image/svg+xml'`, `svgConteudo` obrigatório e rejeitado se contiver `<script>`, `<foreignObject>` ou atributo `on*`. Mensagem do `Left` cita o limite violado.
- **Nota**: MIME real e dimensão são apurados pela infra (`ArquivoService`, sniff de magic bytes); a infra monta o `input` e chama `Arquivo.criar`. A regra fica no domínio; a infra só mede.
- **Reuses**: `Entity`, `Either`. Enum `TipoArquivo` declarado aqui (com placeholders comentados para as outras features).

#### Ports (novas) — `application/ports/`

| Porta | Métodos | Consumidores |
| ----- | ------- | ------------ |
| `SessaoRepository` | `criar(sessao)`, `buscarPorTokenHash(hash)`, `deslizar(id, agora)`, `revogar(id)`, `revogarTodasDoUsuario(usuarioId)` | login, logout, `AuthGuard`, redefinição de senha |
| `RegistroAuditoriaRepository` | `registrar(evento: { entidade; entidadeId; acao; autorId; estadoAnterior; estadoNovo; detalhe? })` — **append-only**, sem `update`/`delete` | decisões de aprovação (EMP-05 AC7) |
| `TokenSenhaRepository` | `criar(token)`, `buscarPorHash(hash)`, `marcarUsado(id)` | recuperação de senha (P2) |
| `Mailer` | `enviar(msg: { para; template: TemplateEmail; dados })` | autocadastro (confirmação), decisão (aprovado/rejeitado), redefinição de senha |
| `Storage` | `salvar(chave, buffer, mime)`, `ler(chave)`, `remover(chave)` — falha de I/O → `StorageIndisponivelError` (503) | upload de logo (EMP-03) |

#### Use-cases

> Todos retornam `Either<Erro, Resultado>` e **só orquestram**: carregam via porta, chamam o método da entidade / factory do VO, persistem. A regra nunca fica no caso de uso.

##### `CriarEmpresaUseCase` — existe, retrabalho grande

- **Location**: `application/use-cases/criar-empresa.ts`
- **Deve fazer**:
  1. `Senha.criar(senha)` → `Left` 422
  2. `Cnpj.create(cnpj)` → `Left` 422 "CNPJ inválido" (**antes** de qualquer consulta — hoje consulta `findByCnpj` primeiro)
  3. Se veio logo, o `ArquivoService` (infra) já entregou um `Arquivo` válido → o caso de uso recebe só o `logoArquivoId?`
  4. Unicidade: `UserRepository.findByEmail(email)` → `Left` 409 "CNPJ ou e-mail já cadastrado"; `EmpresaRepository.findByCnpj` — se o único registro é `REJEITADA`, **reaproveita** voltando a `PENDENTE_APROVACAO` (edge case); senão → 409
  5. Cria `User` (papel `EMPRESA`, `senha` = `Senha` VO, hash via `Hasher` no mapper/infra) **e** `Empresa` (`PENDENTE_APROVACAO`, `usuarioId`, `logoArquivoId?`) na mesma operação — vínculo 1‑1 (AD-013)
  6. `Mailer.enviar(CADASTRO_RECEBIDO)` em `try/catch` — falha vira log, resposta segue (EMP-01 AC9)
  7. `right({ empresaId })`
- **Ports**: `UserRepository`, `EmpresaRepository`, `Hasher`, `Mailer`
- **Reuses**: `Cnpj.create`, `Senha.criar`, `Empresa` / `User` factories

##### `AutenticarUsuarioUseCase` — existe como `AuthenticateUserUseCase`, realinhar

- **Deve fazer**:
  1. `UserRepository.findByEmail(email.toLowerCase())` — inexistente → `Left` `CredenciaisInvalidasError` (401, "Credenciais inválidas") **sem revelar qual campo**
  2. `user.estaBloqueado(agora)` → `Left` `ContaBloqueadaError` (429)
  3. `Hasher.compare(senha, user.senha.valor)` → falha → `user.registrarFalhaDeLogin(agora)` + `UserRepository.save` + `Left` 401
  4. Sucesso → `user.registrarLoginOk()` + `save` + `SessaoRepository.criar` (token opaco 256 bits, guarda `sha256`) → `right({ token, papel })`
- **Nota**: `Encrypter` **sai** deste fluxo (AD-012 mantida — sessão opaca, não JWT). O token cru vira cookie na infra. `agora` entra por parâmetro / injeção de clock.

##### Decisões do admin — `Aprovar / Rejeitar / Suspender / Reativar EmpresaUseCase`

- `Aprovar/Rejeitar/Suspender` **existem**, incompletos (hoje `throw` e sem guarda de transição); `Reativar` **falta**.
- **Deve fazer** (todas — só orquestração):
  1. `user.role !== ADMIN` → `Left` `NotAllowedError` (403)
  2. `EmpresaRepository.findById` → ausente → `Left` `ResourceNotFoundError` (404)
  3. `empresa.aprovar(user.id)` / `empresa.rejeitar(user.id, motivo)` / `empresa.suspender(user.id)` / `empresa.reativar(user.id)` → propaga o `Left` da entidade (409 transição; 422 motivo curto)
  4. `EmpresaRepository.save` + `RegistroAuditoriaRepository.registrar(...)` — **mesma unidade** (EMP-05 AC7). O edge case "decidida concorrentemente" cai no 409 via `updateMany` condicional / CAS na fase de infra
  5. `Mailer.enviar(CADASTRO_APROVADO | CADASTRO_REJEITADO)` em `try/catch`
- **`ListarFilaAprovacaoUseCase`** (novo): `EmpresaRepository.listarPorEstado(PENDENTE_APROVACAO, asc)`, projetando nome/CNPJ/e-mail/data (EMP-04 AC1).
- **`AssegurarEmpresaAprovadaUseCase`** (novo): carrega a empresa, `empresa.estaAprovada()` → `Right` / `Left` 403 "Cadastro ainda não aprovado". Reusado por `campanhas`/`selo-e-qrcode` (EMP-05 AC4).

##### P2 / P3

| Use-case | Faz | AC |
| -------- | --- | -- |
| `EditarDadosEmpresaUseCase` | altera nome fantasia/telefone/endereço/logo; bloqueia `cnpj` → 422; troca de e-mail mantém o antigo até confirmação por link; logo novo não altera selos já gerados | EMP-08 |
| `SolicitarRecuperacaoSenhaUseCase` | sempre `right` (202 neutro); se a conta existe, cria `TokenSenha` (hash, 60 min) + `Mailer(SENHA_REDEFINICAO)` | EMP-09 AC1/AC2 |
| `RedefinirSenhaUseCase` | valida `TokenSenha` (não usado, não expirado) → `Left` 400 "Link de redefinição inválido ou expirado"; `Senha.criar(novaSenha)` → 422; atualiza hash; `SessaoRepository.revogarTodasDoUsuario`; marca token usado | EMP-09 AC3/AC4 |

### Infra — `api/src/infra/` (FASE POSTERIOR)

Módulos transversais (AD-017, revertendo AD-015): `DatabaseModule` (`PrismaService` + adaptadores das portas), `CryptographyModule` (`Argon2Hasher`), `AuthModule` (`SessionService`, `AuthGuard`, `RolesGuard`, `@CurrentUser`, `@Roles`, `@Public`), `MailModule`, `StorageModule`, `HttpModule` (controllers + DTOs + `ZodValidationPipe` + `DomainExceptionFilter`).

| Adaptador | Porta | Nota |
| --------- | ----- | ---- |
| `Prisma{Empresa,User,Sessao,RegistroAuditoria,TokenSenha}Repository` + mappers domínio↔row | os 5 repos | mapper é o custo de AD-017; um por entidade |
| `Argon2Hasher` | `Hasher` | argon2id; fallback `bcrypt` aceito (EMP-01 AC7) |
| `SessionService` | usa `SessaoRepository` | gera token, guarda `sha256`, valida com deslize + expiração 8h |
| `LogMailer` | `Mailer` | loga e resolve sempre; provedor real = troca de adaptador |
| `LocalDiskStorage` + `ArquivoService` | `Storage` | sniff por magic bytes, entrega só por `GET /arquivos/:id` + `nosniff` (AD-016) |
| `DomainExceptionFilter` | — | mapeia `erro.status` → resposta HTTP; exceções nativas do Nest passam direto |

#### Controllers (fase de infra)

| Controller | Rota | Papel | AC |
| ---------- | ---- | ----- | -- |
| `CadastroEmpresaController` | `POST /empresas` (multipart) | público | EMP-01/02/03 |
| | `GET /empresas/me` | `EMPRESA` | EMP-06 |
| | `PATCH /empresas/me`, `PATCH /empresas/me/email` | `EMPRESA` | EMP-08 |
| `AutenticacaoController` | `POST /sessoes` (login) → set-cookie | público | EMP-06/07 |
| | `DELETE /sessoes/atual` (logout) | autenticado | EMP-06 |
| | `POST /senha/recuperacao`, `POST /senha/redefinicao` | público | EMP-09 |
| `AdminEmpresasController` (`@Roles(ADMIN)`) | `GET /admin/empresas?estado=PENDENTE_APROVACAO` | ADMIN | EMP-04 AC1 |
| | `POST /admin/empresas/:id/{aprovacao,rejeicao,suspensao,reativacao}` | ADMIN | EMP-04/05/10 |

### Front-end — `web/` (rotas previstas)

`/cadastro/empresa` · `/login` · `/senha/recuperar` · `/senha/redefinir` · `/app` (área da empresa) · `/admin/empresas` (fila). Contrato `web`↔`api` tipado (AD-010) — decidido no design da primeira tela.

---

## Data Models

Fonte da verdade: entidades em `api/src/domain/fivo/entities/` (AD-017). O schema Prisma abaixo é o **alvo** da fase de infra, derivado das entidades.

```typescript
// entities/senha.ts (NOVO) — VO
class Senha { static criar(raw: string): Either<SenhaFracaError, Senha>; get valor(): string }

// entities/user.ts (estendido + regra)
interface UserProps {
  nome: string; email: string; senha: Senha;         // VO, não string
  role: 'ADMIN' | 'EMPRESA' | 'INSTITUICAO';
  falhasLogin: number; primeiraFalhaEm: Date | null; bloqueadoAte: Date | null;  // NOVO
  createdAt: Date; updatedAt?: Date | null;
}
// métodos: registrarFalhaDeLogin(agora) / estaBloqueado(agora) / registrarLoginOk()

// entities/empresa.ts (modelo + máquina de estados)
interface EmpresaProps {
  usuarioId: UniqueEntityId;                         // NOVO — vínculo 1-1 (AD-013)
  razaoSocial: string; nomeFantasia: string; cnpj: Cnpj;
  telefone: string; cep: string; logradouro: string; numero: string;  // era number
  complemento?: string; bairro: string; cidade: string; uf: string;
  site: string; contato: string;                     // sem `email` — é do User
  logoArquivoId?: UniqueEntityId | null;             // NOVO
  status: 'PENDENTE_APROVACAO' | 'APROVADA' | 'REJEITADA' | 'SUSPENSA';
  decididoPor?: UniqueEntityId | null; decididoEm?: Date | null; motivoDecisao?: string | null;
  emailPendente?: string | null; tokenTrocaEmailHash?: string | null;  // NOVO — P2
  createdAt: Date; updatedAt?: Date | null;
}
// métodos: aprovar(adminId) / rejeitar(adminId, motivo) / suspender(adminId) / reativar(adminId) / estaAprovada()
// SEM setters públicos de status / decidido*

// entities/arquivo.ts (NOVO) — entidade + factory validante
class Arquivo {
  static criar(input: { tipo: TipoArquivo; nomeOriginal: string; mime: string; bytes: number;
    largura?: number; altura?: number; chaveStorage: string; svgConteudo?: string
  }): Either<ArquivoInvalidoError, Arquivo>
}

// novas entidades leves (ou só rows na fase de infra)
interface SessaoProps      { usuarioId; tokenHash; criadaEm; ultimoAcessoEm; revogadaEm?; ip?; userAgent? }
interface RegistroAuditoriaProps { entidade; entidadeId; acao; autorId?; estadoAnterior?; estadoNovo?; detalhe?; criadoEm }
interface TokenSenhaProps  { usuarioId; tokenHash; expiraEm; usadoEm?; criadoEm }
```

**Relationships**: `User 1–1 Empresa`; `User 1–N Sessao / TokenSenha`; `Empresa 0..1–1 Arquivo` (logo). `RegistroAuditoria` sem FK forte (log desacoplado). `usuario.email` único **global**; `empresa.cnpj` único (AD-013).

---

## Error Handling Strategy

Erro de regra de negócio = `UseCaseError` com `status` numérico, devolvido como `Left`. Na fase de infra, `DomainExceptionFilter` traduz `status` → resposta HTTP.

| Cenário | AC | `status` | Mensagem |
| ------- | -- | -------- | -------- |
| CNPJ sem 14 dígitos / DV inválido | EMP-02 AC2 | 422 | "CNPJ inválido" |
| CNPJ ou e-mail já cadastrado | EMP-02 AC3 | 409 | "CNPJ ou e-mail já cadastrado" |
| Senha < 10 caracteres | EMP-02 AC4 | 422 | "A senha deve ter no mínimo 10 caracteres" |
| Logo formato/tamanho/dimensão | EMP-03 AC6 | 422 | mensagem do limite violado |
| Storage indisponível | edge case | 503 | "Não foi possível enviar o logo, tente novamente" |
| E-mail transacional falha | EMP-01 AC9 / EMP-04 | — | nenhum — operação conclui, erro em log |
| Credenciais inválidas | EMP-06 AC2 | 401 | "Credenciais inválidas" (sem distinguir campo) |
| 5 falhas em 15 min | EMP-07 AC3 | 429 | "Muitas tentativas, tente em 15 minutos" |
| Sessão inativa > 8h | EMP-07 AC4 | 401 | novo login exigido |
| Rota restrita sem sessão | EMP-06 AC6 | 401 | — |
| Recurso de outra empresa/papel | EMP-06 AC6 | 403 | "Acesso negado" |
| Transição de estado não permitida | EMP-05 AC5 | 409 | "Operação não permitida para o estado atual" |
| Endpoint de decisão por não-admin | EMP-05 AC6 | 403 | "Acesso negado" — nenhum estado muda |
| Rejeição com motivo < 20 chars | EMP-04 AC3 | 422 | "O motivo deve ter no mínimo 20 caracteres" |
| Token de redefinição inválido/expirado/usado | EMP-09 AC4 | 400 | "Link de redefinição inválido ou expirado" |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| `CriarEmpresaUseCase` está incompleto — sem senha, sem `User`, sem logo, sem e-mail; consulta `findByCnpj` **antes** de validar o formato do CNPJ | `api/src/domain/fivo/application/use-cases/criar-empresa.ts:47` | EMP-01/02/03 não atendidos; CNPJ inválido faz consulta desnecessária e pode retornar 409 em vez de 422 | Task de retrabalho do caso de uso (ordem: senha → CNPJ → logo → unicidade → cria User+Empresa → e-mail) com testes 1:1 aos ACs |
| `Aprovar/Rejeitar/SuspenderEmpresaUseCase` **lançam** `NotAllowedError`/`ResourceNotFoundError` em vez de devolver `Left`; sem `transicaoEmpresaPermitida`; sem auditoria; `Rejeitar` não recebe `motivo` | `.../use-cases/aprovar-empresa.ts:12`, `rejeitar-empresa.ts:12`, `suspender-empresa.ts:12` | EMP-04 AC3, EMP-05 AC5/AC7 não atendidos; API inconsistente (parte `Either`, parte `throw`) | Padronizar em `Either`; introduzir `transicaoEmpresaPermitida` + `RegistroAuditoriaRepository`; `rejeitar` recebe `motivo` e valida ≥ 20 |
| `AuthenticateUserUseCase` devolve `accessToken` via `Encrypter` — não é a sessão opaca de AD-012 (que o usuário pediu para manter) | `.../use-cases/authenticate-user.ts:39` | Modelo de sessão divergente da decisão de projeto | Realinhar para `SessaoRepository` + gerador de token opaco; `Encrypter` sai deste caso de uso |
| Mensagens de erro em inglês ("Wrong credentials provided", "Not allowed", "Resource X not found") | `.../errors/wrong-credentials.error.ts:5`, `api/src/core/errors/*.ts` | Spec fixa mensagens em português ("Credenciais inválidas", "Acesso negado") | Erros de aplicação com mensagem em pt-BR; os erros de `core` são genéricos e a mensagem final é montada no caso de uso ou no filtro |
| `WrongCredentialsError.status` é `static readonly` enquanto os demais erros usam `readonly` de instância | `.../errors/wrong-credentials.error.ts:2` | `DomainExceptionFilter` não acha `erro.status` de instância → cai no 500 | Uniformizar: `status` sempre de instância; um teste do filtro cobre cada erro |
| Sem política de bloqueio de login e sem os contadores em `User` | `entities/user.ts:11` | EMP-07 AC3 (429 após 5 falhas) impossível | Resolvido no design: contadores + métodos `registrarFalhaDeLogin`/`estaBloqueado`/`registrarLoginOk` na entidade `User` (T4); o caso de uso de autenticação (T9) só orquestra |
| Nada roda sobre HTTP ou banco enquanto a infra não existir | `api/src/infra/**` (stubs) | Independent Tests da spec (nível HTTP) e edge cases de concorrência não são verificáveis até a fase B/D | Aceito por AD-017; a fase de infra fecha isso com e2e contra Postgres descartável. Os ACs de domínio ficam cobertos por unit no interim |
| `Empresa` tem `email` próprio que colide com `User.email` | `entities/empresa.ts:31` | Duas fontes de verdade para o e-mail; risco de divergência | Resolvido no design: `email` sai da `Empresa`; o `User` é dono do e-mail de login (T3) |
| `RegistroAuditoria` imutável só por convenção | porta nova | Bug ou acesso direto ao banco altera histórico | v1: nenhum método de repo faz `update`/`delete`; follow-up na infra: `REVOKE UPDATE, DELETE` |
| `numero` do endereço é `number` | `entities/empresa.ts` | "s/n", "123-A", zeros à esquerda não representáveis | Resolvido no design: `numero: string` (T3) |
| `catalogo-instituicoes` / `campanhas` já têm código em `src/domain/fivo/` fora do escopo deste design | `.../use-cases/*-instituicao.ts`, `criar-campanha.ts` | Specs dessas features ainda descrevem a arquitetura antiga | Follow-up: realinhar `catalogo-instituicoes` e `campanhas` da mesma forma; `criar-campanha` hoje exige empresa **e** instituição (não o XOR instituição/causa de AD-006) — resolver lá |
| ERD e diagrama de classes no Lucid desatualizados | Lucid `e2b2491c…`, `d1a3c795…` | Divergem do código | AD-017 torna o Lucid não-canônico; atualizar é follow-up de baixa prioridade |

---

## Tech Decisions (feature-local; as de projeto estão em AD-012…AD-017)

| Decisão | Escolha | Rationale |
| ------- | ------- | --------- |
| Erros de aplicação carregam `status` | campo `readonly status: number` de instância em toda classe de erro do domínio | Um único `DomainExceptionFilter` mapeia sem `instanceof` em cascata |
| Regras de negócio no domínio, não nos casos de uso (rich domain model) | invariante de entidade → método nela (`empresa.aprovar()`, `user.registrarFalhaDeLogin(agora)`); valor restrito sem identidade → VO com `criar`/`create` → `Either` (`Cnpj`, `Senha`); construção validada de entidade com identidade → factory (`Arquivo.criar`); regra entre registros (unicidade) → no caso de uso | Regra e o dado que ela protege ficam juntos; teste 1:1 com os ACs em `entities/*.spec.ts` sem montar o caso de uso; entidade sem setter público de campo governado por invariante |
| Autocadastro cria `User` + `Empresa` juntos | uma operação, um `Either` | AD-013 (vínculo 1‑1 garantido na aplicação); evita estado intermediário sem perfil |
| Decisões do admin retornam `Either`, não `throw` | padroniza com o resto do domínio | consistência de contrato; o filtro trata `Left` e exceção do mesmo jeito, mas o teste fica uniforme |
| `Encrypter` sai do fluxo de login | sessão = token opaco + `SessaoRepository` | AD-012 mantida por decisão do usuário; `encrypt(payload)` não modela revogação imediata |
| Persistência real adiada | portas + in-memory agora; Prisma na fase B | AD-017 — fechar regra de negócio antes da infra |

---

## Requirement Traceability (design)

| Requirement ID | Componentes de design |
| -------------- | --------------------- |
| EMP-01 | `CriarEmpresaUseCase` (retrabalho), `Senha` VO, factories de `User`/`Empresa`, `Mailer`, `UserRepository`, `EmpresaRepository` |
| EMP-02 | `Cnpj.create` (+ testes), `Senha.criar`, `UserRepository.findByEmail`, `EmpresaRepository.findByCnpj` |
| EMP-03 | `Arquivo.criar` (factory validante), `Storage`, `ArquivoService` (infra), `GET /arquivos/:id` (infra) |
| EMP-04 | `ListarFilaAprovacaoUseCase`, `AprovarEmpresaUseCase`, `RejeitarEmpresaUseCase`, `Mailer` |
| EMP-05 | `Empresa.aprovar/rejeitar/suspender/reativar` (máquina de estados), `RegistroAuditoriaRepository`, casos de uso de decisão |
| EMP-06 | `AutenticarUsuarioUseCase`, `SessaoRepository`, `SessionService` + `AuthGuard`/`RolesGuard` (infra) |
| EMP-07 | `User.registrarFalhaDeLogin`/`estaBloqueado`/`registrarLoginOk`, contadores em `User`, `SessionService` (deslize/8h — infra) |
| EMP-08 | `EditarDadosEmpresaUseCase`, fluxo de troca de e-mail, `Arquivo.criar` |
| EMP-09 | `SolicitarRecuperacaoSenhaUseCase`, `RedefinirSenhaUseCase`, `Senha.criar`, `TokenSenhaRepository`, `SessaoRepository.revogarTodasDoUsuario` |
| EMP-10 | `Empresa.suspender/reativar`, `SuspenderEmpresaUseCase`, `ReativarEmpresaUseCase` |

---

## Open follow-ups (não bloqueiam Tasks)

1. Realinhar `catalogo-instituicoes` e `campanhas` à arquitetura de AD-017 (mesmo tratamento que este documento); resolver o XOR instituição/causa em `criar-campanha`.
2. Atualizar ou aposentar o ERD Lucid (`e2b2491c-9824-4422-9c1d-c43cd032a316`) e o diagrama de classes (`d1a3c795-d91a-4bb7-95d5-3ba723ecee53`).
3. Fase de infra: setup de CI para Postgres; `REVOKE UPDATE, DELETE` em `registro_auditoria`.
4. Worker de anonimização de empresa rejeitada após 90 dias (assumption da spec sem AC — só se virar requisito).
5. Rodada de tasks do `web`.
