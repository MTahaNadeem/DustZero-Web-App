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
    // Wait for Recharts ResizeObserver to trigger and render synchronously
    await new Promise(r => setTimeout(r, 500));

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
    const totalImgHeight = innerWidth * imgRatio;
    
    const pageHeaderHeight = 35; // Space for header on first page
    let remainingHeight = totalImgHeight;
    let yPosition = 0; // Tracks the crop y-coordinate in mm-scale
    let isFirstPage = true;

    while (remainingHeight > 0) {
      if (!isFirstPage) {
        pdf.addPage();
      }

      pdf.setFillColor(30, 30, 30);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F'); // Dark background
      
      const currentAvailableHeight = isFirstPage ? pdfHeight - margin - pageHeaderHeight : pdfHeight - margin * 2;
      const currentYOffset = isFirstPage ? margin + pageHeaderHeight : margin;

      if (isFirstPage) {
        // Add header
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
      }

      // Add image segment
      // The y-coordinate in pdf.addImage is negative if we want to crop the top off
      pdf.addImage(imgData, 'PNG', margin, currentYOffset - yPosition, innerWidth, totalImgHeight);
      
      // Since addImage doesn't clip automatically in all viewers, we draw a rectangle over the bottom and top bounds to mask it if necessary.
      // Wait, jsPDF addImage doesn't clip. We need to draw over the margins to mask out the overflowing image parts.
      // Top mask
      pdf.setFillColor(30, 30, 30);
      pdf.rect(0, 0, pdfWidth, currentYOffset, 'F');
      
      // If it's first page, we need to re-draw the header over the mask
      if (isFirstPage) {
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(22);
        pdf.text('DustZero Report', margin, margin + 10);
        pdf.setFontSize(12);
        pdf.setTextColor(150, 150, 150);
        pdf.text(title, margin, margin + 18);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 24);
        pdf.setDrawColor(60, 60, 60);
        pdf.line(margin, margin + 30, pdfWidth - margin, margin + 30);
      }

      // Bottom mask
      pdf.setFillColor(30, 30, 30);
      pdf.rect(0, currentYOffset + currentAvailableHeight, pdfWidth, pdfHeight - (currentYOffset + currentAvailableHeight), 'F');

      remainingHeight -= currentAvailableHeight;
      yPosition += currentAvailableHeight;
      isFirstPage = false;
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
