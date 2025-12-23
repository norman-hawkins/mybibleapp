/*
  Warnings:

  - You are about to drop the column `publishedAt` on the `Commentary` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `Commentary` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Commentary` table. All the data in the column will be lost.
  - Added the required column `book` to the `Commentary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapter` to the `Commentary` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Commentary" DROP CONSTRAINT "Commentary_referenceId_fkey";

-- AlterTable
ALTER TABLE "Commentary" DROP COLUMN "publishedAt",
DROP COLUMN "referenceId",
DROP COLUMN "title",
ADD COLUMN     "bibleReferenceId" TEXT,
ADD COLUMN     "book" TEXT NOT NULL,
ADD COLUMN     "chapter" INTEGER NOT NULL,
ADD COLUMN     "verse" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "image" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Commentary" ADD CONSTRAINT "Commentary_bibleReferenceId_fkey" FOREIGN KEY ("bibleReferenceId") REFERENCES "BibleReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
