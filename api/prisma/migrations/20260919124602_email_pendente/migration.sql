-- CreateTable
CREATE TABLE "email_pendente" (
    "id" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "dados" JSONB,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa_em" TIMESTAMP(3) NOT NULL,
    "enviado_em" TIMESTAMP(3),
    "esgotado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_pendente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_pendente_fila_idx" ON "email_pendente"("enviado_em", "esgotado_em", "proxima_tentativa_em");
