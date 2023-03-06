/*
  Warnings:

  - A unique constraint covering the columns `[created_at]` on the table `comments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[created_at]` on the table `posts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);

-- CreateIndex
CREATE UNIQUE INDEX "comments_created_at_key" ON "comments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "posts_created_at_key" ON "posts"("created_at");
