import { executeLocal, getCompilerStatus } from "../local-executor";

async function main() {
  const compilers = getCompilerStatus();
  console.log(JSON.stringify(compilers, null, 2));

  const java = compilers.find((compiler) => compiler.language === "java");
  if (!java?.available) {
    throw new Error("This smoke test requires the installed Java JDK.");
  }

  const result = await executeLocal(
    `public class Main {
      public static void main(String[] args) {
        System.out.println("JAVA_OK");
      }
    }`,
    "java",
    "",
    10_000,
  );
  console.log(JSON.stringify(result, null, 2));

  if (result.status !== 0 || result.stdout !== "JAVA_OK") {
    throw new Error("Local Java compilation/execution smoke test failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
