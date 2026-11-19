require("dotenv").config();
const { collectAllMetrics } = require("./services/monitoringService");

async function main() {
  try {
    const results = await collectAllMetrics();

    console.log("\nStorage monitoring results:");
    console.table(results);

    const failedNodes = results.filter(
      (node) => !node.isAvailable
    );

    console.log(
      `Available nodes: ${results.length - failedNodes.length}/${results.length}`
    );

    if (failedNodes.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Monitoring test failed:", error.message);
    process.exitCode = 1;
  }
}

main();
