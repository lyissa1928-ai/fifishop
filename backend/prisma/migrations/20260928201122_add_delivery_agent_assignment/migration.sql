-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "deliveryAgentId" TEXT;

-- CreateIndex
CREATE INDEX "Delivery_deliveryAgentId_idx" ON "Delivery"("deliveryAgentId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_deliveryAgentId_fkey" FOREIGN KEY ("deliveryAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
