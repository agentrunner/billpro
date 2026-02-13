import { Transaction, Client, Product } from '../types.ts';

export const exportInvoicesToExcel = (transactions: Transaction[], clients: Client[], products: Product[]) => {
  // @ts-ignore
  const XLSX = window.XLSX;
  if (!XLSX) {
    console.error("SheetJS not loaded");
    alert("Error: Excel library not loaded. Please check your internet connection.");
    return;
  }

  const invoiceData = transactions
    .filter(t => t.type === 'dispatch')
    .map(t => {
      const client = clients.find(c => c.id === t.clientId);
      const product = products.find(p => p.id === t.productId);
      
      return {
        'Invoice ID': t.billNumber || 'N/A',
        'Date': new Date(t.timestamp).toLocaleDateString('en-IN'),
        'Client Name': client?.name || 'Unknown Client',
        'Client Phone': client?.phone || '',
        'Product': t.productName,
        'Quantity': t.quantity,
        'Unit': product?.unit || '',
        'Rate (INR)': t.rate || 0,
        'Total Amount (INR)': t.total || 0,
        'Profit (INR)': t.profit || 0
      };
    });

  if (invoiceData.length === 0) {
    alert("No invoice data available to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(invoiceData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

  // Generate date string for filename
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Invoices_Export_${dateStr}.xlsx`);
};