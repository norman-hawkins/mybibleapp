-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'USER');

-- CreateEnum
CREATE TYPE "CommentaryStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleReference" (
    "id" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER,

    CONSTRAINT "BibleReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commentary" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" "CommentaryStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Commentary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BibleReference_book_chapter_idx" ON "BibleReference"("book", "chapter");

-- AddForeignKey
ALTER TABLE "Commentary" ADD CONSTRAINT "Commentary_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commentary" ADD CONSTRAINT "Commentary_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "BibleReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
