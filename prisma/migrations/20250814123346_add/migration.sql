/*
  Warnings:

  - You are about to drop the column `webhookUrl` on the `Session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Session" DROP COLUMN "webhookUrl",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "onReceive_webhookUrl" TEXT,
ADD COLUMN     "onSend_webhookUrl" TEXT,
ADD COLUMN     "onUpdateStatus_webhookUrl" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "public"."Session"("id");
