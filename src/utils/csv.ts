export function parseCsv<T extends Record<string, string>>(
  text: string,
  requiredHeaders: readonly string[] = []
): T[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (inQuotes) throw new Error("Unclosed quoted CSV field");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...body] = rows;
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}`);
  }
  if (requiredHeaders.length > 0 && new Set(headers).size !== headers.length) {
    throw new Error("Duplicate CSV columns");
  }
  return body.map((values) => {
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? "";
    });
    return item as T;
  });
}

export function splitCell(value = ""): string[] {
  return value.split("|").filter(Boolean);
}
