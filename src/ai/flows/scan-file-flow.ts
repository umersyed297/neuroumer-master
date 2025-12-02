
'use server';
/**
 * @fileOverview A Genkit flow for scanning files using VirusTotal API.
 * This flow is responsible ONLY for the VirusTotal scan and does NOT save to the database.
 *
 * - scanFile - Submits a file for analysis and retrieves the VT report.
 * - ScanFileInput - The input type for the scanFile function.
 * - ScanFileOutput - The return type for the scanFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// NOTE: Firestore logic has been removed from this flow.
// The client is now responsible for saving the report to the database.

const FileInfoSchema = z.object({
  name: z.string().optional().describe("Original name of the scanned file."),
  size: z.number().optional().describe("Size of the file in bytes."),
  md5: z.string().optional().describe("MD5 hash of the file."),
  sha1: z.string().optional().describe("SHA1 hash of the file."),
  sha256: z.string().optional().describe("SHA256 hash of the file."),
});

const ScanFileInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "The file content as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  fileName: z.string().describe('The original name of the file.'),
  // userId is no longer needed here as the flow doesn't save to DB.
});
export type ScanFileInput = z.infer<typeof ScanFileInputSchema>;

const ScanFileOutputSchema = z.object({
  analysisId: z.string().describe("The VirusTotal analysis ID."),
  status: z.string().describe("Status of the VirusTotal scan (e.g., 'queued', 'in-progress', 'completed', 'error')."),
  scanDate: z.number().optional().describe("Unix timestamp of when the VT scan was completed or last updated."),
  stats: z.object({
    harmless: z.number().default(0),
    malicious: z.number().default(0),
    suspicious: z.number().default(0),
    timeout: z.number().default(0),
    undetected: z.number().default(0),
  }).optional().describe("Summary statistics of the VirusTotal scan results."),
  results: z.record(z.string(), z.object({
    category: z.string(),
    result: z.string().nullable(),
    method: z.string(),
    engine_name: z.string(),
  })).optional().describe("Detailed results from each VirusTotal antivirus engine."),
  fileInfo: FileInfoSchema.optional().describe("Information about the scanned file, including hashes (primarily from VT)."),
  threatLabel: z.string().optional().describe("A human-readable threat label derived from VirusTotal scan statistics (e.g., High, Medium, Low, Clean, Unknown)."),
  permalink: z.string().optional().describe("Permanent link to the full VirusTotal report for this file analysis."),
  error: z.string().optional().describe("Error message if the VirusTotal scan process failed."),
});
export type ScanFileOutput = z.infer<typeof ScanFileOutputSchema>;

const VT_API_URL = 'https://www.virustotal.com/api/v3';
const POLLING_INTERVAL_VT = 15000; // 15 seconds for VT
const MAX_POLLS_VT = 12; // Max 3 minutes for VT (Increased from 8)

function dataUriToBuffer(dataUri: string): { buffer: Buffer; mimeType: string; fileNamePart: string } {
  const parts = dataUri.split(',');
  const meta = parts[0];
  const data = parts[1];
  const mimeMatch = meta.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const nameMatch = meta.match(/name=(.*?);/); 
  const fileNamePart = nameMatch ? decodeURIComponent(nameMatch[1]) : 'uploaded_file';
  const buffer = Buffer.from(data, 'base64');
  return { buffer, mimeType, fileNamePart };
}

function determineThreatLabel(stats?: ScanFileOutput['stats']): string {
  if (stats?.malicious && stats.malicious > 5) return 'Critical';
  if (stats?.malicious && stats.malicious > 0) return 'High';
  if (stats?.suspicious && stats.suspicious > 0) return 'Medium';
  if (stats && stats.malicious === 0 && stats.suspicious === 0 && (stats.harmless > 0 || stats.undetected > 0)) return 'Clean';
  if (stats) return 'Low';
  return 'Unknown';
}

export async function scanFile(input: ScanFileInput): Promise<ScanFileOutput> {
  return scanFileFlow(input);
}

const scanFileFlow = ai.defineFlow(
  {
    name: 'scanFileFlow',
    inputSchema: ScanFileInputSchema,
    outputSchema: ScanFileOutputSchema,
  },
  async (input): Promise<ScanFileOutput> => {
    const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
    let scanOutput: ScanFileOutput = { 
        analysisId: '', 
        status: 'error', 
        error: 'Scan not initiated.',
        fileInfo: { name: input.fileName }
    };

    console.log('[scanFileFlow] Received input:', { fileName: input.fileName });

    if (!vtApiKey) {
      const noApiKeyError = 'VirusTotal API key is not configured on the server.';
      console.error('[scanFileFlow]', noApiKeyError);
      scanOutput = { ...scanOutput, error: noApiKeyError };
    } else {
      const { buffer, mimeType } = dataUriToBuffer(input.fileDataUri);

      const MAX_VT_FILE_SIZE_BYTES = 32 * 1024 * 1024; // 32MB for VirusTotal Public API
      if (buffer.length > MAX_VT_FILE_SIZE_BYTES) {
        const fileSizeError = `File size (${(buffer.length / (1024*1024)).toFixed(2)}MB) exceeds VirusTotal's public API limit of 32MB.`;
        console.error('[scanFileFlow]', fileSizeError);
        return { ...scanOutput, status: 'error', error: fileSizeError, fileInfo: { name: input.fileName, size: buffer.length } };
      }

      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: mimeType }), input.fileName);
      let analysisIdFromUpload: string = '';

      try {
        console.log('[scanFileFlow] Uploading file to VirusTotal...');
        const uploadResponse = await fetch(`${VT_API_URL}/files`, {
          method: 'POST',
          headers: { 'x-apikey': vtApiKey },
          body: formData,
        });

        if (!uploadResponse.ok) {
          let errorDetail = `VirusTotal API Error (Upload): Status ${uploadResponse.status} ${uploadResponse.statusText}.`;
          let vtErrorData;
          try {
            vtErrorData = await uploadResponse.json();
            const specificVtErrorMessage = vtErrorData?.error?.message || vtErrorData?.error?.code || JSON.stringify(vtErrorData?.error || vtErrorData).substring(0,150);
            errorDetail += ` VirusTotal Message: ${specificVtErrorMessage}`;
          } catch (jsonError) {
            try {
              const textError = await uploadResponse.text();
              errorDetail += ` Response Body (first 200 chars): ${textError.substring(0, 200)}`;
            } catch (textParseError) {
              errorDetail += ` Could not parse error response body.`;
            }
          }
          console.error('[scanFileFlow] VirusTotal Upload Error:', errorDetail);
          scanOutput = { ...scanOutput, analysisId: '', status: 'error', error: errorDetail };
        } else {
          const uploadResult = await uploadResponse.json();
          analysisIdFromUpload = uploadResult?.data?.id;
          console.log('[scanFileFlow] VirusTotal Analysis ID from Upload:', analysisIdFromUpload);

          if (!analysisIdFromUpload) {
            const errorMsg = 'Failed to get analysis ID from VirusTotal upload response. Response: ' + JSON.stringify(uploadResult).substring(0,100);
            console.error('[scanFileFlow]', errorMsg);
            scanOutput = { ...scanOutput, analysisId: '', status: 'error', error: errorMsg };
          } else {
            scanOutput.analysisId = analysisIdFromUpload;
            let pollAttempt = 0;
            let completed = false;
            let currentStatus = 'queued';
            let errorMsgFromPolling;

            console.log(`[scanFileFlow] Starting to poll VirusTotal for analysis ID: ${analysisIdFromUpload}...`);
            while (pollAttempt < MAX_POLLS_VT && !completed) {
              await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_VT));
              console.log(`[scanFileFlow] Polling attempt ${pollAttempt + 1}/${MAX_POLLS_VT} for ${analysisIdFromUpload}...`);
              
              let analysisResponse;
              try {
                analysisResponse = await fetch(`${VT_API_URL}/analyses/${analysisIdFromUpload}`, {
                  headers: { 'x-apikey': vtApiKey },
                });
              } catch (fetchPollError: any) {
                 console.error(`[scanFileFlow] Network error during polling attempt ${pollAttempt + 1} for ${analysisIdFromUpload}:`, fetchPollError.message);
                 if (pollAttempt === MAX_POLLS_VT - 1) {
                    currentStatus = 'error';
                    errorMsgFromPolling = `Network error during final VirusTotal analysis poll: ${fetchPollError.message}. Scan for ${analysisIdFromUpload} may be incomplete.`;
                 }
                 pollAttempt++;
                 continue;
              }

              if (!analysisResponse.ok) {
                 if (pollAttempt === MAX_POLLS_VT - 1) { 
                    let analysisErrorDetail = `VirusTotal API Error (Analysis - final attempt): Status ${analysisResponse.status} ${analysisResponse.statusText}.`;
                    try { const errorData = await analysisResponse.json(); analysisErrorDetail += ` VirusTotal Message: ${errorData?.error?.message || JSON.stringify(errorData?.error || errorData).substring(0,150)}`; } 
                    catch (e) { try { const textError = await analysisResponse.text(); analysisErrorDetail += ` Response: ${textError.substring(0,200)}`;} catch (e2) {} }
                    currentStatus = 'error';
                    errorMsgFromPolling = analysisErrorDetail;
                    console.error('[scanFileFlow] VirusTotal Analysis Error (final attempt):', errorMsgFromPolling);
                 } else {
                    console.warn(`[scanFileFlow] VirusTotal Analysis poll attempt ${pollAttempt + 1} failed with status ${analysisResponse.status}. Retrying...`);
                 }
                 pollAttempt++;
                 continue; 
              }

              const analysisResult = await analysisResponse.json();
              const attributes = analysisResult?.data?.attributes;
              const meta = analysisResult?.meta; 
              currentStatus = attributes?.status || 'error'; 
              console.log('[scanFileFlow] Poll status:', currentStatus);

              if (!attributes) {
                errorMsgFromPolling = 'Scan failed: Unexpected VirusTotal analysis structure. Response: ' + JSON.stringify(analysisResult).substring(0,100);
                console.error('[scanFileFlow]', errorMsgFromPolling);
                completed = true; 
              } else if (attributes.status === 'completed') {
                const fileInfoFromMeta = meta?.file_info || {};
                scanOutput = {
                  analysisId: analysisIdFromUpload,
                  status: attributes.status,
                  scanDate: attributes.date,
                  stats: attributes.stats,
                  results: attributes.results,
                  fileInfo: {
                    name: input.fileName, 
                    size: fileInfoFromMeta.size,
                    md5: fileInfoFromMeta.md5,
                    sha1: fileInfoFromMeta.sha1,
                    sha256: fileInfoFromMeta.sha256,
                  },
                  permalink: `https://www.virustotal.com/gui/file-analysis/${analysisIdFromUpload}`,
                  threatLabel: determineThreatLabel(attributes.stats),
                };
                completed = true;
                console.log('[scanFileFlow] Scan completed successfully.');
              } else if (attributes.status === 'queued' || attributes.status === 'inprogress') {
                if (pollAttempt === MAX_POLLS_VT - 1) {
                    errorMsgFromPolling = 'Scan timed out on VirusTotal after maximum polling attempts.';
                    console.warn('[scanFileFlow] Scan timed out.');
                    break; 
                }
              } else { 
                errorMsgFromPolling = `Scan ended with unexpected status from VirusTotal: ${attributes.status}`;
                console.error('[scanFileFlow] Unexpected scan status:', attributes.status);
                completed = true; 
              }
              pollAttempt++;
            }
            
            if (!completed && !scanOutput.error) { 
                 scanOutput.status = currentStatus;
                 scanOutput.error = errorMsgFromPolling || `VirusTotal scan for ${analysisIdFromUpload} did not complete within the allocated time. Status: ${currentStatus}`;
            } else if (errorMsgFromPolling && scanOutput.status !== 'completed') { 
                 scanOutput.status = currentStatus; 
                 scanOutput.error = errorMsgFromPolling;
            }
          }
        }
      } catch (err: any) {
        console.error('[scanFileFlow] Unhandled exception during VirusTotal file scan:', err);
        let specificError = `An unexpected error occurred in the scan flow: ${err.message || 'Unknown error'}.`;
        if (err.message && (err.message.toLowerCase().includes('fetch failed') || err.message.toLowerCase().includes('networkerror'))) {
            specificError = 'A network error occurred while trying to communicate with VirusTotal. Please check the server\'s internet connection or try again later.';
        }
        scanOutput = { ...scanOutput, status: 'error', error: specificError };
      }
    }
    
    if (!scanOutput.status) {
        console.error('[scanFileFlow] ScanOutput status was not properly set. Defaulting to error.');
        scanOutput.status = 'error';
        scanOutput.error = scanOutput.error || 'An unexpected error occurred setting scan output status.';
    }
    if (!scanOutput.analysisId) {
        scanOutput.analysisId = '';
    }

    // REMOVED: Firestore saving logic. This is now handled by the client.
    console.log('[scanFileFlow] Flow finished, returning scan output to be handled by client.');
    return scanOutput;
  }
);
