const input = document.querySelector("#file"), dropzone = document.querySelector("#dropzone"), message = document.querySelector("#message"), results = document.querySelector("#results");
document.querySelector("#browse").addEventListener("click", () => input.click());
input.addEventListener("change", () => input.files[0] && inspect(input.files[0]));
for (const event of ["dragenter", "dragover"]) dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add("dragging"); });
for (const event of ["dragleave", "drop"]) dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove("dragging"); });
dropzone.addEventListener("drop", (e) => { const file = e.dataTransfer.files[0]; if (file) inspect(file); });
function cell(row, value, className = "") { const td = document.createElement("td"); td.textContent = value ?? "—"; if (className) td.className = className; row.append(td); }
async function inspect(file) {
  if (!file.name.toLowerCase().endsWith(".har")) { message.textContent = "Choose a .har file."; return; }
  if (file.size > 10 * 1024 * 1024) { message.textContent = "File exceeds the 10 MiB limit."; return; }
  message.textContent = "Inspecting supplied capture…"; results.hidden = true;
  try {
    const response = await fetch("/api/inspect/har", { method: "POST", headers: { "content-type": "application/json" }, body: await file.text() });
    const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Inspection failed.");
    document.querySelector("#count").textContent = data.entryCount;
    document.querySelector("#evidence").textContent = data.evidence.length;
    document.querySelector("#errors").textContent = data.requests.filter((r) => r.status >= 400).length;
    document.querySelector("#filename").textContent = file.name;
    const rows = document.querySelector("#rows"); rows.replaceChildren();
    for (const request of data.requests) {
      const tr = document.createElement("tr"); cell(tr, request.method, "method"); cell(tr, request.url, "url");
      cell(tr, request.status, request.status >= 400 ? "error" : "status"); cell(tr, request.timeMs == null ? "—" : request.timeMs + " ms"); rows.append(tr);
    }
    document.querySelector("#coverage").textContent = data.coverage.description + " " + data.coverage.limitations.join(" ");
    results.hidden = false; message.textContent = "Inspection complete. Sensitive header and query values were redacted in the results.";
  } catch (error) { message.textContent = error.message; }
}