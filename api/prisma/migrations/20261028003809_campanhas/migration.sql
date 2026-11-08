-- CreateEnum
CREATE TYPE "campanha_status" AS ENUM ('RASCUNHO', 'EM_ANALISE', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "alteracao_campanha_status" AS ENUM ('EM_ANALISE', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "tipo_regra_doacao" AS ENUM ('POR_UNIDADE', 'PERCENTUAL');

-- AlterEnum
ALTER TYPE "tipo_arquivo" ADD VALUE 'IMAGEM_CAMPANHA';

-- CreateTable
CREATE TABLE "campanha" (
    "id" TEXT NOT NULL,
    "id_publico" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "capa_arquivo_id" TEXT,
    "instituicao_id" TEXT,
    "causa_id" TEXT,
    "regra_tipo" "tipo_regra_doacao",
    "regra_valor_centavos" INTEGER,
    "regra_percentual_centesimos" INTEGER,
    "meta_centavos" INTEGER,
    "data_inicio" DATE,
    "data_fim" DATE,
    "status" "campanha_status" NOT NULL,
    "submetida_em" TIMESTAMP(3),
    "decidido_por" TEXT,
    "decidido_em" TIMESTAMP(3),
    "motivo_ultima_rejeicao" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_em" TIMESTAMP(3),

    CONSTRAINT "campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanha_alteracao" (
    "id" TEXT NOT NULL,
    "campanha_id" TEXT NOT NULL,
    "instituicao_id" TEXT,
    "causa_id" TEXT,
    "regra_tipo" "tipo_regra_doacao" NOT NULL,
    "regra_valor_centavos" INTEGER,
    "regra_percentual_centesimos" INTEGER,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "status" "alteracao_campanha_status" NOT NULL,
    "motivo" TEXT,
    "decidido_por" TEXT,
    "decidido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanha_alteracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campanha_id_publico_key" ON "campanha"("id_publico");

-- CreateIndex
CREATE UNIQUE INDEX "campanha_capa_arquivo_id_key" ON "campanha"("capa_arquivo_id");

-- CreateIndex
CREATE INDEX "campanha_status_idx" ON "campanha"("status");

-- CreateIndex
CREATE INDEX "campanha_empresa_id_idx" ON "campanha"("empresa_id");

-- CreateIndex
CREATE INDEX "campanha_alteracao_campanha_id_idx" ON "campanha_alteracao"("campanha_id");

-- AddForeignKey
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_instituicao_id_fkey" FOREIGN KEY ("instituicao_id") REFERENCES "instituicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_causa_id_fkey" FOREIGN KEY ("causa_id") REFERENCES "causa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_capa_arquivo_id_fkey" FOREIGN KEY ("capa_arquivo_id") REFERENCES "arquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha_alteracao" ADD CONSTRAINT "campanha_alteracao_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL manual (design.md, Data Models): o Prisma não representa CHECK nem
-- índice parcial no schema.

-- Campanha: no máximo uma beneficiada. O rascunho pode não ter nenhuma; a
-- regra "exatamente uma" vale na submissão (domínio).
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_beneficiada_xor"
  CHECK ("instituicao_id" IS NULL OR "causa_id" IS NULL);

-- Alteração: o compromisso proposto é sempre completo, com exatamente uma
-- beneficiada.
ALTER TABLE "campanha_alteracao" ADD CONSTRAINT "campanha_alteracao_beneficiada_xor"
  CHECK (("instituicao_id" IS NULL) <> ("causa_id" IS NULL));

-- Uma alteração em análise por campanha (Alteração AC4): barra no banco a
-- corrida entre duas aberturas.
CREATE UNIQUE INDEX "campanha_alteracao_uma_pendente"
  ON "campanha_alteracao" ("campanha_id") WHERE "status" = 'EM_ANALISE';
