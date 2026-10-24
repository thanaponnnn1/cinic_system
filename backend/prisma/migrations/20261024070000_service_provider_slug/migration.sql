-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");
