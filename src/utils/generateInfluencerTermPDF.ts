import { jsPDF } from "jspdf";
import { InfluencerPartnership } from "@/hooks/useInfluencerPartnerships";

export function generateInfluencerTermPDF(
  influencer: InfluencerPartnership,
  termContent: string,
  termTitle: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  // Replace placeholders
  const content = termContent
    .replace(/\{PERCENTUAL\}/g, String(influencer.commission_percent))
    .replace(/\{NOME_INFLUENCIADOR\}/g, influencer.name)
    .replace(/\{DATA\}/g, new Date().toLocaleDateString("pt-BR"));

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(termTitle, pageWidth / 2, 30, { align: "center" });

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, margin, 42);

  // Influencer info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Influenciador:", margin, 52);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${influencer.name}`, margin, 58);
  if (influencer.email) doc.text(`Email: ${influencer.email}`, margin, 64);
  if (influencer.instagram_handle) doc.text(`Instagram: ${influencer.instagram_handle}`, margin, 70);
  doc.text(`Comissão: ${influencer.commission_percent}%`, margin, influencer.instagram_handle ? 76 : (influencer.email ? 70 : 64));

  // Content
  let yPos = influencer.instagram_handle ? 86 : (influencer.email ? 80 : 74);
  doc.setFontSize(10);
  
  const lines = content.split("\n");
  for (const line of lines) {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    if (line.match(/^\d+\.\s+[A-ZÀ-Ú]/)) {
      // Section headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const wrappedLines = doc.splitTextToSize(line, maxWidth);
      doc.text(wrappedLines, margin, yPos);
      yPos += wrappedLines.length * 6 + 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    } else if (line.trim() === "") {
      yPos += 4;
    } else {
      const wrappedLines = doc.splitTextToSize(line, maxWidth);
      doc.text(wrappedLines, margin, yPos);
      yPos += wrappedLines.length * 5 + 1;
    }
  }

  // Signature area
  yPos = Math.max(yPos + 20, 220);
  if (yPos > 250) {
    doc.addPage();
    yPos = 40;
  }

  doc.setFontSize(10);
  doc.line(margin, yPos, margin + 70, yPos);
  doc.text("Pela Empresa - BarberSoft", margin, yPos + 6);

  doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
  doc.text(`Influenciador - ${influencer.name}`, pageWidth - margin - 70, yPos + 6);

  // Download
  doc.save(`Termo_Parceria_${influencer.name.replace(/\s+/g, "_")}.pdf`);
}
