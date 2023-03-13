/*
  Warnings:

  - You are about to drop the column `negative_votes` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `positive_votes` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `negative_votes` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `positive_votes` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "comments" DROP COLUMN "negative_votes",
DROP COLUMN "positive_votes";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "negative_votes",
DROP COLUMN "positive_votes";

-- CreateTable
CREATE TABLE "posts_votes" (
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "positive" BOOLEAN NOT NULL,

    CONSTRAINT "posts_votes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "comments_votes" (
    "user_id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "positive" BOOLEAN NOT NULL,

    CONSTRAINT "comments_votes_pkey" PRIMARY KEY ("user_id","comment_id")
);

-- AddForeignKey
ALTER TABLE "posts_votes" ADD CONSTRAINT "posts_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts_votes" ADD CONSTRAINT "posts_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments_votes" ADD CONSTRAINT "comments_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments_votes" ADD CONSTRAINT "comments_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
