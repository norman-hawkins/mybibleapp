-- CreateTable
CREATE TABLE "SourceSegment" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapterStart" INTEGER NOT NULL,
    "chapterEnd" INTEGER NOT NULL,
    "verseStart" INTEGER,
    "verseEnd" INTEGER,
    "anchorsJson" TEXT,
    "heading" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "anchorRaw" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceSegment_sourceKey_book_chapterStart_chapterEnd_idx" ON "SourceSegment"("sourceKey", "book", "chapterStart", "chapterEnd");

-- CreateIndex
CREATE INDEX "SourceSegment_sourceKey_book_chapterStart_verseStart_verseE_idx" ON "SourceSegment"("sourceKey", "book", "chapterStart", "verseStart", "verseEnd");
