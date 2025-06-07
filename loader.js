// loader.js
import("./contentScript.js").catch((err) =>
  console.error("Failed to load module:", err)
);
