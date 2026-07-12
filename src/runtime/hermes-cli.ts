import { spawn } from "node:child_process";

export type HermesRun = {
  output: string;
  durationMs: number;
};

export async function runHermes(
  prompt: string,
  skills: string[],
  timeoutMs = 180_000,
  toolsets?: string[],
  signal?: AbortSignal,
): Promise<HermesRun> {
  const startedAt = Date.now();
  const args = ["/root/.local/bin/hermes", "-z", prompt];
  if (skills.length > 0) args.push("--skills", skills.join(","));
  if (toolsets && toolsets.length > 0) args.push("--toolsets", toolsets.join(","));

  return await new Promise((resolve, reject) => {
    const child = spawn(
      "wsl.exe",
      args,
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    const abort = () => {
      child.kill();
      reject(new Error("Hermes run aborted"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Hermes timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Hermes exited with code ${code}`));
        return;
      }
      resolve({ output: stdout.trim(), durationMs: Date.now() - startedAt });
    });
  });
}
