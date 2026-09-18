-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EMPRESA', 'INSTITUICAO');

-- CreateEnum
CREATE TYPE "empresa_status" AS ENUM ('PENDENTE_APROVACAO', 'APROVADA', 'REJEITADA', 'SUSPENSA');

-- CreateEnum
CREATE TYPE "tipo_arquivo" AS ENUM ('LOGO_EMPRESA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "falhas_login" INTEGER NOT NULL DEFAULT 0,
    "primeira_falha_em" TIMESTAMP(3),
    "bloqueado_ate" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_em" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "site" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "logo_arquivo_id" TEXT,
    "status" "empresa_status" NOT NULL,
    "decidido_por" TEXT,
    "decidido_em" TIMESTAMP(3),
    "motivo_decisao" TEXT,
    "email_pendente" TEXT,
    "token_troca_email_hash" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_em" TIMESTAMP(3),

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL,
    "ultimo_acesso_em" TIMESTAMP(3) NOT NULL,
    "revogada_em" TIMESTAMP(3),
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "usuario_id" TEXT,
    "entidade_id" TEXT,
    "dados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_senha" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),

    CONSTRAINT "token_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivo" (
    "id" TEXT NOT NULL,
    "tipo" "tipo_arquivo" NOT NULL,
    "nome_original" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "chave_storage" TEXT NOT NULL,
    "svg_conteudo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_usuario_id_key" ON "empresa"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_cnpj_key" ON "empresa"("cnpj");

-- CreateIndex
CREATE INDEX "empresa_status_criado_em_idx" ON "empresa"("status", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_token_hash_key" ON "sessao"("token_hash");

-- CreateIndex
CREATE INDEX "sessao_usuario_id_idx" ON "sessao"("usuario_id");

-- CreateIndex
CREATE INDEX "registro_auditoria_entidade_id_idx" ON "registro_auditoria"("entidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_senha_token_hash_key" ON "token_senha"("token_hash");

-- CreateIndex
CREATE INDEX "token_senha_usuario_id_idx" ON "token_senha"("usuario_id");

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_logo_arquivo_id_fkey" FOREIGN KEY ("logo_arquivo_id") REFERENCES "arquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_senha" ADD CONSTRAINT "token_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
