'use client';

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
} from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScanFileOutput } from '@/ai/flows/scan-file-flow';
import type { ScanUrlOutput } from '@/ai/flows/scan-url-flow';

function getThreatHexColor(threatLabel?: string): string {
  switch (threatLabel?.toLowerCase()) {
    case 'critical': return '#FF0000'; // Red
    case 'high': return '#FF4500'; // OrangeRed
    case 'medium': return '#FFA500'; // Orange
    case 'low': return '#FFFF00'; // Yellow
    case 'clean': return '#008000'; // Green
    default: return '#000000'; // Black for Unknown or other
  }
}

// ===== DOCX Generation Logic =====

function createSectionTitle(text: string): Paragraph {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }
  });
}

function createSubTitle(text: string): Paragraph {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function createInfoRow(label: string, value?: string | number | null, valueColor?: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
      new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(value ?? 'N/A'), color: valueColor?.replace('#', '') })] })] }),
    ],
  });
}

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

export async function generateScanReportDocx(
  result: ScanFileOutput | ScanUrlOutput,
  scanType: 'file' | 'url'
): Promise<void> {
  const isFileScan = scanType === 'file' && 'fileInfo' in result;
  const fileResult = isFileScan ? (result as ScanFileOutput) : null;
  const urlResult = !isFileScan ? (result as ScanUrlOutput) : null;

  const threatColor = getThreatHexColor(result.threatLabel);
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'NeuroShield Scan Report',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    createSectionTitle('Overall Scan Summary'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        createInfoRow('Scan Type:', scanType === 'file' ? 'File Scan' : 'URL Scan'),
        createInfoRow('Target:', fileResult?.fileInfo?.name || urlResult?.submittedUrl),
        createInfoRow('Scan Date:', result.scanDate ? new Date(result.scanDate * 1000).toLocaleString() : 'N/A'),
        createInfoRow('Overall Threat Assessment:', result.threatLabel, threatColor),
        createInfoRow('VirusTotal Analysis ID:', result.analysisId),
      ],
      borders: NO_BORDER,
    }),
  ];

  // VirusTotal Details
  children.push(createSectionTitle('VirusTotal Analysis Details'));
  if (result.error) {
    children.push(new Paragraph({ text: `VirusTotal Scan Error: ${result.error}`, style: "IntenseReference" }));
  } else if (result.stats) {
    children.push(createSubTitle('Detection Summary'));
    const vtTotalScanned = (result.stats.harmless ?? 0) + (result.stats.malicious ?? 0) + (result.stats.suspicious ?? 0) + (result.stats.timeout ?? 0) + (result.stats.undetected ?? 0);
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createInfoRow('Malicious Detections:', result.stats.malicious),
          createInfoRow('Suspicious Detections:', result.stats.suspicious),
          createInfoRow('Harmless Detections:', result.stats.harmless),
          createInfoRow('Undetected by Engines:', result.stats.undetected),
          createInfoRow('Engines Timed Out:', result.stats.timeout),
          createInfoRow('Total Engines Scanned:', vtTotalScanned),
        ],
        borders: NO_BORDER,
      })
    );
    if (result.permalink) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: 'View Full VirusTotal Report: ' }),
          new ExternalHyperlink({
              children: [new TextRun({ text: result.permalink, style: "Hyperlink" })],
              link: result.permalink,
          }),
        ],
        spacing: { before: 100 }
      }));
    }
    if (isFileScan && fileResult?.fileInfo) {
      children.push(createSubTitle('File Hashes (from VirusTotal)'));
      children.push(new Paragraph({ children: [new TextRun({ text: 'MD5: ', bold: true }), new TextRun(fileResult.fileInfo.md5 || 'N/A')] }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'SHA1: ', bold: true }), new TextRun(fileResult.fileInfo.sha1 || 'N/A')] }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'SHA256: ', bold: true }), new TextRun(fileResult.fileInfo.sha256 || 'N/A')] }));
    }
  } else if (result.status && result.status !== 'completed') {
     children.push(new Paragraph({ text: `VirusTotal scan status: ${result.status}. Full details may not be available.`}));
  } else {
    children.push(new Paragraph({ text: 'VirusTotal scan data not available or scan did not complete.' }));
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Generated by NeuroShield', size: 18, italic: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 100 },
  }));

  const doc = new Document({
    creator: 'NeuroShield',
    title: 'NeuroShield Scan Report',
    description: 'Scan report generated by NeuroShield using VirusTotal',
    styles: {
        paragraphStyles: [
            {
                id: "IntenseReference",
                name: "Intense Reference",
                basedOn: "Normal",
                quickFormat: true,
                run: { color: "FF0000" },
            },
        ],
    },
    sections: [{
      properties: {},
      children: children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const targetName = (fileResult?.fileInfo?.name || urlResult?.submittedUrl || 'scan_report')
      .replace(/[^a-z0-9_.-]/gi, '_')
      .substring(0, 50);
    saveAs(blob, `NeuroShield_VTReport_${targetName}.docx`);
  } catch (error) {
    console.error("Error generating DOCX report:", error);
  }
}


// ===== PDF Generation Logic =====

export async function generateScanReportPdf(
  result: ScanFileOutput | ScanUrlOutput,
  scanType: 'file' | 'url'
): Promise<void> {
  const doc = new jsPDF();
  const isFileScan = scanType === 'file' && 'fileInfo' in result;
  const fileResult = isFileScan ? (result as ScanFileOutput) : null;
  const urlResult = !isFileScan ? (result as ScanUrlOutput) : null;

  const threatColor = getThreatHexColor(result.threatLabel);
  const targetName = fileResult?.fileInfo?.name || urlResult?.submittedUrl || 'scan_report';
  const cleanTargetName = targetName.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50);

  // Title
  doc.setFontSize(22);
  doc.text('NeuroShield Scan Report', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

  // Summary
  doc.setFontSize(16);
  doc.text('Overall Scan Summary', 14, 40);
  autoTable(doc, {
    startY: 45,
    theme: 'plain',
    body: [
      ['Scan Type:', scanType === 'file' ? 'File Scan' : 'URL Scan'],
      ['Target:', targetName],
      ['Scan Date:', result.scanDate ? new Date(result.scanDate * 1000).toLocaleString() : 'N/A'],
      ['Overall Threat Assessment:', result.threatLabel || 'N/A'],
      ['VirusTotal Analysis ID:', result.analysisId],
    ],
    styles: { fontSize: 11 },
    columnStyles: { 0: { fontStyle: 'bold' } },
    didParseCell: (data) => {
        if(data.row.index === 3 && data.column.index === 1){
            data.cell.styles.textColor = threatColor;
        }
    }
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 15;

  // VirusTotal Details
  doc.setFontSize(16);
  doc.text('VirusTotal Analysis Details', 14, finalY);
  finalY += 8;

  if (result.error) {
    doc.setFontSize(11);
    doc.setTextColor('#FF0000');
    doc.text(`VirusTotal Scan Error: ${result.error}`, 14, finalY);
    doc.setTextColor('#000000');
  } else if (result.stats) {
    doc.setFontSize(14);
    doc.text('Detection Summary', 14, finalY);
    finalY += 5;
    const vtTotalScanned = (result.stats.harmless ?? 0) + (result.stats.malicious ?? 0) + (result.stats.suspicious ?? 0) + (result.stats.timeout ?? 0) + (result.stats.undetected ?? 0);
    autoTable(doc, {
        startY: finalY,
        theme: 'plain',
        body: [
            ['Malicious Detections:', result.stats.malicious],
            ['Suspicious Detections:', result.stats.suspicious],
            ['Harmless Detections:', result.stats.harmless],
            ['Undetected by Engines:', result.stats.undetected],
            ['Engines Timed Out:', result.stats.timeout],
            ['Total Engines Scanned:', vtTotalScanned],
        ],
        styles: { fontSize: 11 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    finalY = (doc as any).lastAutoTable.finalY + 8;
    
    if (result.permalink) {
      doc.setFontSize(11);
      doc.setTextColor('#0000FF');
      doc.textWithLink('View Full VirusTotal Report', 14, finalY, { url: result.permalink });
      doc.setTextColor('#000000');
      finalY += 10;
    }
    
    if (isFileScan && fileResult?.fileInfo) {
      doc.setFontSize(14);
      doc.text('File Hashes (from VirusTotal)', 14, finalY);
      finalY += 5;
      autoTable(doc, {
        startY: finalY,
        theme: 'grid',
        head: [['Hash Type', 'Value']],
        body: [
          ['MD5', fileResult.fileInfo.md5 || 'N/A'],
          ['SHA1', fileResult.fileInfo.sha1 || 'N/A'],
          ['SHA256', fileResult.fileInfo.sha256 || 'N/A'],
        ],
         styles: { fontSize: 10 },
      });
      finalY = (doc as any).lastAutoTable.finalY;
    }
  } else {
    doc.setFontSize(11);
    doc.text('VirusTotal scan data not available or scan did not complete.', 14, finalY);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor('#808080');
  doc.text('Generated by NeuroShield', doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save(`NeuroShield_VTReport_${cleanTargetName}.pdf`);
}