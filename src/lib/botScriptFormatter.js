export const formatBotScript = (script = "") =>
  script
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
