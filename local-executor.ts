import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { mkdtemp, rm, writeFile } from "fs/promises";

export type LanguageId = "python" | "python3" | "javascript" | "java" | "c" | "cpp";

type Tool = {
  command: string;
  prefixArgs?: string[];
};

export type CompilerStatus = {
  language: LanguageId;
  label: string;
  available: boolean;
  executable?: string;
  detail: string;
};

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  status: number;
  error: string | null;
};

const isWindows = process.platform === "win32";
const executableExtensions = isWindows
  ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
  : [""];

function existingFile(candidate: string): string | undefined {
  try {
    return fs.statSync(candidate).isFile() ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function findOnPath(names: string[]): string | undefined {
  const directories = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const directory of directories) {
    const cleanDirectory = directory.replace(/^"(.*)"$/, "$1");
    for (const name of names) {
      const hasExtension = Boolean(path.extname(name));
      const extensions = hasExtension ? [""] : executableExtensions;
      for (const extension of extensions) {
        const match = existingFile(path.join(cleanDirectory, `${name}${extension}`));
        if (match) return match;
      }
    }
  }
  return undefined;
}

function findJavaTool(name: "java" | "javac"): string | undefined {
  const javaHome = process.env.JAVA_HOME?.replace(/^"(.*)"$/, "$1");
  if (javaHome) {
    const fromJavaHome = existingFile(
      path.join(javaHome, "bin", isWindows ? `${name}.exe` : name),
    );
    if (fromJavaHome) return fromJavaHome;
  }
  return findOnPath([name]);
}

function detectTools() {
  const pythonPath = findOnPath(isWindows ? ["python", "python3", "py"] : ["python3", "python"]);
  const python: Tool | undefined = pythonPath
    ? {
        command: pythonPath,
        prefixArgs: path.basename(pythonPath).toLowerCase().startsWith("py.") ? ["-3"] : [],
      }
    : undefined;

  return {
    python,
    javascript: findOnPath(["node"]),
    java: findJavaTool("java"),
    javac: findJavaTool("javac"),
    c: findOnPath(["gcc", "clang"]),
    cpp: findOnPath(["g++", "clang++"]),
  };
}

export function getCompilerStatus(): CompilerStatus[] {
  const tools = detectTools();
  const javaAvailable = Boolean(tools.java && tools.javac);
  return [
    {
      language: "java",
      label: "Java",
      available: javaAvailable,
      executable: tools.javac,
      detail: javaAvailable
        ? `JDK found (${process.env.JAVA_HOME ? "JAVA_HOME/PATH" : "PATH"})`
        : "A JDK is required. Set JAVA_HOME or add java and javac to PATH.",
    },
    {
      language: "python",
      label: "Python",
      available: Boolean(tools.python),
      executable: tools.python?.command,
      detail: tools.python ? "Python 3 runtime found on PATH." : "Python 3 was not found on PATH.",
    },
    {
      language: "javascript",
      label: "JavaScript",
      available: Boolean(tools.javascript),
      executable: tools.javascript,
      detail: tools.javascript ? "Node.js runtime found on PATH." : "Node.js was not found on PATH.",
    },
    {
      language: "c",
      label: "C",
      available: Boolean(tools.c),
      executable: tools.c,
      detail: tools.c ? "C compiler found on PATH." : "GCC or Clang was not found on PATH.",
    },
    {
      language: "cpp",
      label: "C++",
      available: Boolean(tools.cpp),
      executable: tools.cpp,
      detail: tools.cpp ? "C++ compiler found on PATH." : "G++ or Clang++ was not found on PATH.",
    },
  ];
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  stdin: string,
  timeoutMs: number,
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;
    const maxOutputBytes = 1024 * 1024;
    let timer: NodeJS.Timeout;

    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const finish = (result: ExecutionResult) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    const stopForOutputLimit = () => {
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > maxOutputBytes) {
        child.kill("SIGKILL");
        finish({
          stdout: stdout.slice(0, maxOutputBytes),
          stderr: `${stderr.slice(0, maxOutputBytes)}\nOutput limit exceeded.`,
          status: -1,
          error: "Output Limit Exceeded",
        });
      }
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      stopForOutputLimit();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      stopForOutputLimit();
    });
    child.on("error", (error) =>
      finish({ stdout, stderr: error.message, status: -1, error: "Execution Error" }),
    );
    child.on("close", (code) =>
      finish({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        status: code ?? -1,
        error: code === 0 ? null : "Execution/Compiler Error",
      }),
    );

    child.stdin.end(stdin);
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        stdout: stdout.trim(),
        stderr: `${stderr.trim()}${stderr ? "\n" : ""}Execution timed out.`,
        status: -1,
        error: "Time Limit Exceeded",
      });
    }, timeoutMs);
  });
}

export function isLanguageSupported(language: string): language is LanguageId {
  return ["python", "python3", "javascript", "java", "c", "cpp"].includes(language);
}

export async function executeLocal(
  code: string,
  language: LanguageId,
  stdin: string,
  timeoutMs = 10_000,
): Promise<ExecutionResult> {
  const tools = detectTools();
  const workDir = await mkdtemp(path.join(os.tmpdir(), "adhi-arena-"));

  try {
    if (language === "python" || language === "python3") {
      if (!tools.python) throw new Error("Python 3 is not installed or is not available on PATH.");
      const source = path.join(workDir, "main.py");
      await writeFile(source, code, "utf8");
      return await runProcess(
        tools.python.command,
        [...(tools.python.prefixArgs || []), source],
        workDir,
        stdin,
        timeoutMs,
      );
    }

    if (language === "javascript") {
      if (!tools.javascript) throw new Error("Node.js is not installed or is not available on PATH.");
      const source = path.join(workDir, "main.js");
      await writeFile(source, code, "utf8");
      return await runProcess(tools.javascript, [source], workDir, stdin, timeoutMs);
    }

    if (language === "java") {
      if (!tools.java || !tools.javac) {
        throw new Error("Java JDK is not available. Set JAVA_HOME or add java and javac to PATH.");
      }
      const source = path.join(workDir, "Main.java");
      await writeFile(source, code, "utf8");
      const compiled = await runProcess(tools.javac, ["-encoding", "UTF-8", source], workDir, "", timeoutMs);
      if (compiled.status !== 0) return compiled;
      return await runProcess(tools.java, ["-cp", workDir, "Main"], workDir, stdin, timeoutMs);
    }

    const isCpp = language === "cpp";
    const compiler = isCpp ? tools.cpp : tools.c;
    if (!compiler) {
      throw new Error(`${isCpp ? "C++" : "C"} compiler not found. Install GCC/Clang and add it to PATH.`);
    }
    const source = path.join(workDir, isCpp ? "main.cpp" : "main.c");
    const output = path.join(workDir, isWindows ? "program.exe" : "program");
    await writeFile(source, code, "utf8");
    const compiled = await runProcess(
      compiler,
      [source, isCpp ? "-std=c++17" : "-std=c17", "-O2", "-o", output],
      workDir,
      "",
      timeoutMs,
    );
    if (compiled.status !== 0) return compiled;
    return await runProcess(output, [], workDir, stdin, timeoutMs);
  } catch (error: any) {
    return {
      stdout: "",
      stderr: error?.message || "Local execution failed.",
      status: -1,
      error: "Compiler Not Available",
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
