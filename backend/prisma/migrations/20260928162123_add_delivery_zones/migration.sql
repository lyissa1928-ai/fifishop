-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'SÃ©nÃ©gal';

-- AlterTable
ALTER TABLE "OrderAddress" ALTER COLUMN "country" SET DEFAULT 'SÃ©nÃ©gal';

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "freeDeliveryThreshold" INTEGER,
    "estimatedMinDays" INTEGER,
    "estimatedMaxDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_slug_key" ON "DeliveryZone"("slug");

-- CreateIndex
CREATE INDEX "DeliveryZone_isActive_idx" ON "DeliveryZone"("isActive");

-- CreateIndex
CREATE INDEX "DeliveryZone_position_idx" ON "DeliveryZone"("position");
