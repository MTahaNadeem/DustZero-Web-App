import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportElementToPDF = async (
  elementId: string, 
  filename: string, 
  title: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  // Save original styling
  const originalDisplay = element.style.display;
  const originalPosition = element.style.position;
  
  // Make element visible for capture if it's hidden, but push it off-screen
  element.style.display = 'block';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#1E1E1E', // Match dark theme roughly
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const margin = 10;
    const innerWidth = pdfWidth - margin * 2;
    
    // Calculate height based on aspect ratio
    const imgRatio = canvas.height / canvas.width;
    const imgHeight = innerWidth * imgRatio;
    
    // Add header
    pdf.setFillColor(30, 30, 30);
    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F'); // Dark background
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text('DustZero Report', margin, margin + 10);
    
    pdf.setFontSize(12);
    pdf.setTextColor(150, 150, 150);
    pdf.text(title, margin, margin + 18);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 24);
    
    // Add separator
    pdf.setDrawColor(60, 60, 60);
    pdf.line(margin, margin + 30, pdfWidth - margin, margin + 30);

    // Add image
    if (imgHeight <= pdfHeight - (margin + 35)) {
      // Fits on one page
      pdf.addImage(imgData, 'PNG', margin, margin + 35, innerWidth, imgHeight);
    } else {
      // Too tall, needs logic for multiple pages if desired, or we just let it scale to fit page height.
      // For this simplified export, we will scale it to fit one page.
      const scaledWidth = (pdfHeight - (margin + 35)) / imgRatio;
      const xOffset = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin + 35, scaledWidth, pdfHeight - (margin + 35));
    }

    pdf.save(filename);
  } finally {
    // Restore styling
    element.style.display = originalDisplay;
    element.style.position = originalPosition;
    element.style.left = '';
    element.style.top = '';
  }
};
