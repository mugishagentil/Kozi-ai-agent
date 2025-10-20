/*
  Warnings:

  - You are about to alter the column `embedding` on the `documents` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `LongText`.

*/
-- AlterTable
ALTER TABLE `documents` MODIFY `embedding` LONGTEXT NULL;
