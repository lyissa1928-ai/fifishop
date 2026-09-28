/*
  Warnings:

  - You are about to alter the column `stockQuantity` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `lowStockLevel` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `stockQuantity` on the `ProductVariant` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `lowStockLevel` on the `ProductVariant` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to drop the column `newQuantity` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `previousQuantity` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `StockMovement` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - Added the required column `newquantity` to the `StockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previousquantity` to the `StockMovement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'SÃƒÂ©nÃƒÂ©gal';

-- AlterTable
ALTER TABLE "OrderAddress" ALTER COLUMN "country" SET DEFAULT 'SÃƒÂ©nÃƒÂ©gal';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "stockQuantity" SET DEFAULT 0,
ALTER COLUMN "stockQuantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "lowStockLevel" SET DEFAULT 5,
ALTER COLUMN "lowStockLevel" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "stockQuantity" SET DEFAULT 0,
ALTER COLUMN "stockQuantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "lowStockLevel" SET DEFAULT 5,
ALTER COLUMN "lowStockLevel" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "newQuantity",
DROP COLUMN "previousQuantity",
ADD COLUMN     "newquantity" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "previousquantity" DECIMAL(12,3) NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);
