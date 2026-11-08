-- AlterTable
ALTER TABLE "campanha" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "empresa" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "campanha_empresa_id_slug_key" ON "campanha"("empresa_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_slug_key" ON "empresa"("slug");

