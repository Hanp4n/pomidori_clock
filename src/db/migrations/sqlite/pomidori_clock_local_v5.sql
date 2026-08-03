-- migration 5: tokens moved to the OS keychain, no longer stored on the user row
ALTER TABLE "User" DROP COLUMN "access_token";
ALTER TABLE "User" DROP COLUMN "refresh_token";
