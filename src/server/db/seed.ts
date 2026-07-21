import "dotenv/config";

import { connectDB } from "@/server/db/client";
import { seedInitialAdmin } from "@/server/db/seed-admin";

connectDB()
  .then((db) => seedInitialAdmin(db))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
