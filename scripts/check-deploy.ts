import { loadEnvConfig } from "@next/env";
import { deploymentIssues } from "../src/lib/deployment";

if (process.env.VERCEL !== "1") loadEnvConfig(process.cwd());
const { errors, warnings } = deploymentIssues(process.env);
for (const warning of warnings) console.warn(`[After Care deployment] ${warning}`);
for (const error of errors) console.error(`[After Care deployment] ${error}`);
if (errors.length) process.exitCode = 1;
else console.log("Deployment environment check passed. No secret values were printed.");
