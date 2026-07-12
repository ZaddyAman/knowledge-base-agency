import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
  const skillsArgument = skills.join(",");
  const toolsetsArgument = toolsets?.join(",") ?? "";
  const safeOption = /^[a-zA-Z0-9_,.-]*$/;
  if (!safeOption.test(skillsArgument) || !safeOption.test(toolsetsArgument)) {
    throw new Error("Invalid Hermes skill or toolset name");
  }
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1_000));
  const promptPath = join(tmpdir(), `atlas-hermes-${randomUUID()}.txt`);
  await writeFile(promptPath, prompt, { encoding: "utf8", mode: 0o600 });
  const wslPromptPath = promptPath
    .replace(/^([A-Za-z]):/, (_, drive: string) => `/mnt/${drive.toLowerCase()}`)
    .replaceAll("\\", "/");
  const wslRunnerPath = resolve("scripts/run-hermes-safe.sh")
    .replace(/^([A-Za-z]):/, (_, drive: string) => `/mnt/${drive.toLowerCase()}`)
    .replaceAll("\\", "/");

  return await new Promise((resolve, reject) => {
    const child = spawn(
      "wsl.exe",
      ["sh", wslRunnerPath, wslPromptPath, String(timeoutSeconds), skillsArgument, toolsetsArgument],
      { windowsHide: true },
    );
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    const abort = () => {
      child.kill();
      void unlink(promptPath).catch(() => undefined);
      reject(new Error("Hermes run aborted"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));

    const timeout = setTimeout(() => {
      child.kill();
      void unlink(promptPath).catch(() => undefined);
      reject(new Error(`Hermes did not exit after ${timeoutMs + 10_000}ms`));
    }, timeoutMs + 10_000);

    child.on("error", (error) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      void unlink(promptPath).catch(() => undefined);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      void unlink(promptPath).catch(() => undefined);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Hermes exited with code ${code}`));
        return;
      }
      resolve({ output: stdout.trim(), durationMs: Date.now() - startedAt });
    });
  });
}
