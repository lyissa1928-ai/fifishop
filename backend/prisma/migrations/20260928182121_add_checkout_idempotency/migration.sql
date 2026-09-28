/*
  Warnings:

  - You are about to drop the column `newquantity` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `previousquantity` on the `StockMovement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `newQuantity` to the `StockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previousQuantity` to the `StockMovement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'SÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©gal';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "OrderAddress" ALTER COLUMN "country" SET DEFAULT 'SÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©gal';

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "newquantity",
DROP COLUMN "previousquantity",
ADD COLUMN     "newQuantity" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "previousQuantity" DECIMAL(12,3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
