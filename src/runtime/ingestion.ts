import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PENDING_FILES = 50;
const MAX_PENDING_BYTES = 50 * 1024 * 1024;
const allowedExtensions = new Set([".md", ".txt"]);

type PendingUpload = { id: string; path: string; sha256: string; size: number; originalName: string; receivedAt: string; passages: number };
type PendingRegistry = { uploads: PendingUpload[] };
type Manifest = { sources: Array<{ path: string; sha256: string; sourceUrl: string }> };
let mutationQueue: Promise<unknown> = Promise.resolve();

function safeName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

async function readRegistry(registryPath: string): Promise<PendingRegistry> {
  try { return JSON.parse(await readFile(registryPath, "utf8")) as PendingRegistry; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { uploads: [] }; throw error; }
}

export async function ingestKnowledgeFiles(formData: FormData) {
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) throw new Error("Select at least one Markdown or text file.");
  if (files.length > MAX_FILES) throw new Error(`Upload at most ${MAX_FILES} files at once.`);

  const candidates = await Promise.all(files.map(async (file) => {
    const extension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.has(extension)) throw new Error(`${file.name}: only .md and .txt files are supported in this demo.`);
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: file exceeds the 2 MB limit.`);
    const body = Buffer.from(await file.arrayBuffer());
    return { file, body, sha256: createHash("sha256").update(body).digest("hex") };
  }));

  const operation = mutationQueue.then(async () => {
    const root = process.cwd();
    const pendingRoot = path.join(root, "data/posthog-demo/pending");
    const registryPath = path.join(root, "data/posthog-demo/pending-uploads.json");
    const registry = await readRegistry(registryPath);
    const pendingBytes = registry.uploads.reduce((total, upload) => total + upload.size, 0);
    const newCandidates = candidates.filter((candidate) => !registry.uploads.some((upload) => upload.sha256 === candidate.sha256));
    if (registry.uploads.length + newCandidates.length > MAX_PENDING_FILES) throw new Error("The pending review queue is full (50 files). Ask the Knowledge Owner to review it.");
    if (pendingBytes + newCandidates.reduce((total, candidate) => total + candidate.file.size, 0) > MAX_PENDING_BYTES) throw new Error("The pending review queue has reached its 50 MB limit.");

    await mkdir(pendingRoot, { recursive: true });
    const writtenPaths: string[] = [];
    const accepted: Array<{ name: string; size: number; sha256: string; passages: number; status: "pending_review" }> = [];
    try {
      for (const candidate of candidates) {
        const duplicate = registry.uploads.find((upload) => upload.sha256 === candidate.sha256);
        if (duplicate) {
          accepted.push({ name: candidate.file.name, size: candidate.file.size, sha256: candidate.sha256, passages: duplicate.passages, status: "pending_review" });
          continue;
        }
        const id = randomUUID();
        const storedName = `${id}-${safeName(candidate.file.name)}`;
        const storedPath = path.join(pendingRoot, storedName);
        await writeFile(storedPath, candidate.body, { flag: "wx" });
        writtenPaths.push(storedPath);
        const passages = Math.max(1, candidate.body.toString("utf8").split(/\n\s*\n/).filter(Boolean).length);
        registry.uploads.push({ id, path: storedName, sha256: candidate.sha256, size: candidate.file.size, originalName: candidate.file.name, receivedAt: new Date().toISOString(), passages });
        accepted.push({ name: candidate.file.name, size: candidate.file.size, sha256: candidate.sha256, passages, status: "pending_review" });
      }
      const temporaryRegistry = `${registryPath}.${randomUUID()}.tmp`;
      await writeFile(temporaryRegistry, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
      await rename(temporaryRegistry, registryPath);
      return { accepted, corpus: { pending: registry.uploads.length } };
    } catch (error) {
      await Promise.all(writtenPaths.map((writtenPath) => unlink(writtenPath).catch(() => undefined)));
      throw error;
    }
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

export async function getKnowledgeSummary() {
  const root = process.cwd();
  const manifest = JSON.parse((await readFile(path.join(root, "data/posthog-demo/manifest.json"), "utf8")).replace(/^\uFEFF/, "")) as Manifest;
  const registry = await readRegistry(path.join(root, "data/posthog-demo/pending-uploads.json"));
  return { sources: manifest.sources.length, pending: registry.uploads.length };
}
