import * as pdfjs from 'pdfjs-dist';

// For Node.js, we might need to point to the worker explicitly or disable it.
// In newer versions of pdfjs-dist, it uses ESM by default.
// We'll try to set the worker to the same package's worker file.
// If this fails, we fall back to a more manual approach.

interface PdfParseResult {
  success: boolean;
  text: string;
  error?: string;
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  try {
    if (!buffer || buffer.length === 0) {
      return { success: false, text: '', error: 'Empty file' };
    }

    // Convert Buffer to Uint8Array for pdfjs
    const data = new Uint8Array(buffer);

    // Initializing PDF loading
    const loadingTask = pdfjs.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      // For Node.js, we should ideally disable the worker or set it to a valid script.
      // In some environments, setting verbosity to 0 also helps avoid noise.
    });

    let pdfDocument;
    try {
      pdfDocument = await loadingTask.promise;
    } catch (loadError: any) {
      const msg = loadError.message || loadError.name || '';
      console.error('[PDF Load Error]:', loadError);
      
      if (msg.includes('Password') || msg.toLowerCase().includes('password')) {
        return { success: false, text: '', error: 'PDF is password protected' };
      }
      if (msg.includes('Invalid PDF structure') || msg.includes('header') || msg.includes('FormatError')) {
        return { success: false, text: '', error: 'Invalid or corrupted PDF' };
      }
      return { success: false, text: '', error: `Unsupported PDF format: ${msg}` };
    }

    let fullText = '';
    const numPages = pdfDocument.numPages;

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text items and join them
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      } catch (pageError) {
        console.warn(`Warning: Could not extract text from page ${i}`, pageError);
      }
    }

    const trimmedText = fullText.trim();
    if (!trimmedText) {
      return { success: false, text: '', error: 'Unsupported PDF format (no extractable text found)' };
    }

    return { success: true, text: trimmedText };
  } catch (error: any) {
    console.error('[PDF Parser Service Critical Error]:', error);
    return { 
      success: false, 
      text: '', 
      error: error.message || 'Unknown PDF parsing error' 
    };
  }
}
