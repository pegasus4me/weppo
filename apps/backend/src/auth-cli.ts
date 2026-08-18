import "dotenv/config";

import { loadConfig } from "./config/env.js";
import { createAuth } from "./lib/auth.js";
import { createDatabase } from "./lib/database.js";

const config = loadConfig();
const database = createDatabase(config);

export const auth = createAuth(config, database);
