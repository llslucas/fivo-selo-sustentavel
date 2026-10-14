-- CreateEnum
CREATE TYPE "instituicao_status" AS ENUM ('PENDENTE_APROVACAO', 'APROVADA', 'REJEITADA', 'SUSPENSA', 'INATIVA');

-- CreateEnum
CREATE TYPE "causa_status" AS ENUM ('ATIVA', 'INATIVA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "tipo_arquivo" ADD VALUE 'LOGO_INSTITUICAO';
ALTER TYPE "tipo_arquivo" ADD VALUE 'DOCUMENTO_INSTITUICAO';

-- CreateTable
CREATE TABLE "causa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_busca" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "causa_status" NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_em" TIMESTAMP(3),

    CONSTRAINT "causa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instituicao" (
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
    "descricao" TEXT NOT NULL,
    "causa_id" TEXT NOT NULL,
    "logo_arquivo_id" TEXT,
    "documento_arquivo_id" TEXT NOT NULL,
    "documento_descricao" TEXT,
    "status" "instituicao_status" NOT NULL,
    "decidido_por" TEXT,
    "decidido_em" TIMESTAMP(3),
    "motivo_decisao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_em" TIMESTAMP(3),

    CONSTRAINT "instituicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "causa_nome_busca_key" ON "causa"("nome_busca");

-- CreateIndex
CREATE UNIQUE INDEX "instituicao_usuario_id_key" ON "instituicao"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "instituicao_cnpj_key" ON "instituicao"("cnpj");

-- CreateIndex
CREATE INDEX "instituicao_status_criado_em_idx" ON "instituicao"("status", "criado_em");

-- CreateIndex
CREATE INDEX "instituicao_causa_id_status_idx" ON "instituicao"("causa_id", "status");

-- AddForeignKey
ALTER TABLE "instituicao" ADD CONSTRAINT "instituicao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituicao" ADD CONSTRAINT "instituicao_causa_id_fkey" FOREIGN KEY ("causa_id") REFERENCES "causa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituicao" ADD CONSTRAINT "instituicao_logo_arquivo_id_fkey" FOREIGN KEY ("logo_arquivo_id") REFERENCES "arquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instituicao" ADD CONSTRAINT "instituicao_documento_arquivo_id_fkey" FOREIGN KEY ("documento_arquivo_id") REFERENCES "arquivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
