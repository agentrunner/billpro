
export const generateInvoicePDF = (data: {
  companyName: string;
  billNumber: string;
  client: { name: string; phone: string; address: string };
  product: { name: string; quantity: number; rate: number; total: number; unit: string };
  date: string;
}) => {
  // @ts-ignore
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    console.error("jsPDF not loaded");
    alert("Error: PDF library not loaded. Please check your internet connection.");
    return;
  }

  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(data.companyName, 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('TAX INVOICE', 105, 28, { align: 'center' });
  
  // Line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 35, 190, 35);

  // Bill Info
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Bill No: ${data.billNumber}`, 20, 45);
  doc.text(`Date: ${data.date}`, 190, 45, { align: 'right' });

  // Client Details
  doc.setFont("helvetica", "bold");
  doc.text('Bill To:', 20, 60);
  doc.setFont("helvetica", "normal");
  doc.text(data.client.name, 20, 67);
  doc.text(`Phone: ${data.client.phone}`, 20, 74);
  doc.text(`Address: ${data.client.address}`, 20, 81, { maxWidth: 100 });

  // Table
  const tableData = [
    [data.product.name, `${data.product.quantity} ${data.product.unit}`, `INR ${data.product.rate.toFixed(2)}`, `INR ${data.product.total.toFixed(2)}`]
  ];

  // @ts-ignore
  doc.autoTable({
    startY: 95,
    head: [['Product Description', 'Quantity', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY || 150;
  
  // Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount: INR ${data.product.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, finalY + 20, { align: 'right' });

  // Signatures
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text('Authorized Signatory', 190, finalY + 50, { align: 'right' });
  doc.line(140, finalY + 45, 190, finalY + 45);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Computer generated invoice. No signature required.', 105, 285, { align: 'center' });

  // Output
  doc.save(`${data.billNumber}_${data.client.name.replace(/\s+/g, '_')}.pdf`);
};
