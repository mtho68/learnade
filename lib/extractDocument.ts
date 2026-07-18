export type ExtractionResult = {
  text: string;
  title: string;
  kind: "pdf" | "docx" | "pptx" | "text";
};

const cleanText = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function titleFromFile(file: File) {
  return file.name.replace(/\.(pdf|docx|pptx|txt)$/i, "").replace(/[-_]+/g, " ");
}

async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  if(document.numPages>150){await document.destroy();throw new Error("Choose a PDF with 150 pages or fewer.");}
  const pages: string[] = [];
  try{for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {const page=await document.getPage(pageNumber);const content=await page.getTextContent();pages.push(content.items.map((item)=>("str" in item?item.str:"")).join(" "));page.cleanup()}}finally{await document.destroy()}
  return pages.join("\n\n");
}

async function extractDocx(file: File) {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function extractPptx(file: File) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  if(slideNames.length>200)throw new Error("Choose a presentation with 200 slides or fewer.");
  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async("text");
    if (!xml) continue;
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    const text = Array.from(parsed.getElementsByTagName("a:t")).map((node) => node.textContent || "").join(" ");
    if (text.trim()) slides.push(text.trim());
  }
  return slides.join("\n\n");
}

export async function extractDocument(file: File): Promise<ExtractionResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text = "";
  let kind: ExtractionResult["kind"];
  if (extension === "pdf") { text = await extractPdf(file); kind = "pdf"; }
  else if (extension === "docx") { text = await extractDocx(file); kind = "docx"; }
  else if (extension === "pptx") { text = await extractPptx(file); kind = "pptx"; }
  else if (extension === "txt") { text = await file.text(); kind = "text"; }
  else throw new Error("Choose a PDF, DOCX, PPTX, or TXT file.");
  const cleaned = cleanText(text);
  if (!cleaned) throw new Error("We couldn’t find readable text in that file.");
  return { text: cleaned, title: titleFromFile(file), kind };
}
