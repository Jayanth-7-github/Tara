// Simple CSV exporter compatible with Excel
export function exportToCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    alert("No data to export");
    return;
  }

  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")];
  for (const row of rows) {
    const vals = keys.map((k) => {
      const v = row[k] == null ? "" : String(row[k]);
      // escape double quotes
      const esc = v.replace(/"/g, '""');
      // wrap in quotes if contains comma/newline/quote
      if (esc.search(/,|\n|"/) >= 0) return `"${esc}"`;
      return esc;
    });
    lines.push(vals.join(","));
  }

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
