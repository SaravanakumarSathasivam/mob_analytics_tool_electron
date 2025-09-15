/* resolve-mitm-script.ts - put somewhere in main-process code */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app, dialog } from "electron";

/** ESM-safe __dirname for this module */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Try multiple candidate paths and return the first existing file.
 * Priority:
 *  1. MITM_SCRIPT_PATH env var (absolute)
 *  2. Module-relative dev path (same folder as compiled module)
 *  3. Project source path (useful in dev when compiled output sits elsewhere)
 *  4. Packaged resourcesPath (app.isPackaged)
 *  5. Fallback: prompt user to pick file via dialog (returns chosen path or null)
 */
export async function resolveMitmScriptFilename(allowPrompt = true): Promise<string | null> {
  // 1) env override
  const envPath = process.env.MITM_SCRIPT_PATH;
  if (envPath) {
    const abs = path.resolve(envPath);
    if (fs.existsSync(abs)) {
      console.log("[resolveMitmScript] using MITM_SCRIPT_PATH:", abs);
      return abs;
    } else {
      console.warn("[resolveMitmScript] MITM_SCRIPT_PATH set but file missing:", abs);
    }
  }

  // 2) module-relative (compiled location). Good for dev if script copied into dist-electron next to compiled JS.
  const moduleCandidate = path.join(__dirname, "mitm_script.py");
  if (fs.existsSync(moduleCandidate)) {
    console.log("[resolveMitmScript] using module-relative candidate:", moduleCandidate);
    return moduleCandidate;
  }

  // 3) project source path (assumes you run app from repo root during dev)
  // common layouts: <repo>/electron/processes/mitm_script.py or <repo>/src/electron/processes/mitm_script.py
  const projectRootCandidate1 = path.join(process.cwd(), "electron", "processes", "mitm_script.py");
  const projectRootCandidate2 = path.join(process.cwd(), "src", "electron", "processes", "mitm_script.py");
  for (const cand of [projectRootCandidate1, projectRootCandidate2]) {
    if (fs.existsSync(cand)) {
      console.log("[resolveMitmScript] using project-root candidate:", cand);
      return cand;
    }
  }

  // 4) packaged resources (electron-builder / packaged app)
  if (app && app.isPackaged) {
    const packagedCandidate = path.join(process.resourcesPath, "mitm_script.py");
    if (fs.existsSync(packagedCandidate)) {
      console.log("[resolveMitmScript] using packaged resourcesPath candidate:", packagedCandidate);
      return packagedCandidate;
    }
  }

  // 5) last resort: ask user to pick file
  console.warn("[resolveMitmScript] mitm_script.py not found automatically. Checked:", {
    moduleCandidate,
    projectRootCandidate1,
    projectRootCandidate2,
    packaged: app && app.isPackaged ? path.join(process.resourcesPath, "mitm_script.py") : null,
  });

  if (allowPrompt && app) {
    // showOpenDialog must run in main process
    const res = await dialog.showOpenDialog({
      title: "Locate mitm_script.py",
      properties: ["openFile"],
      filters: [{ name: "Python", extensions: ["py"] }],
    });
    if (!res.canceled && res.filePaths && res.filePaths[0]) {
      console.log("[resolveMitmScript] user selected:", res.filePaths[0]);
      return res.filePaths[0];
    }
  }

  return null;
}
