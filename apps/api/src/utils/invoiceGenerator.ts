export interface InvoiceParams {
  paymentId: string;
  orderId: string;
  gatewayPaymentId?: string;
  studentName: string;
  studentEmail: string;
  programmeTitle: string;
  cohortCode: string;
  amount: number;
  currency: string;
  paidAt?: Date;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  student: {
    name: string;
    email: string;
  };
  service: {
    programmeTitle: string;
    cohortCode: string;
  };
  financials: {
    amountSmallestUnit: number;
    currency: string;
    totalFormatted: string;
    baseTuition: string;
    taxAmount: string;
  };
  paymentAudit: {
    orderId: string;
    paymentId: string;
    gatewayPaymentId: string;
    status: string;
  };
  legalAndTax: {
    gstNotice: string;
    accountantReminder: string;
  };
}

export function generateInvoiceData(params: InvoiceParams): InvoiceData {
  const {
    paymentId,
    orderId,
    gatewayPaymentId,
    studentName,
    studentEmail,
    programmeTitle,
    cohortCode,
    amount,
    currency,
    paidAt = new Date(),
  } = params;

  const invoiceNumber = `INV-${new Date().getFullYear()}-${orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;

  const isINR = currency === "INR";
  const totalMajor = (amount / 100).toFixed(2);
  const baseMajor = isINR ? (amount / 1.18 / 100).toFixed(2) : totalMajor;
  const taxMajor = isINR ? (Number(totalMajor) - Number(baseMajor)).toFixed(2) : "0.00";
  const halfTax = (Number(taxMajor) / 2).toFixed(2);

  const gstDisclosures = [
    "[GST DETAILS: Educational & Professional Training Services - SAC Code 999293]",
    "ByteHUB Entity GSTIN: [29AAAAA0000A1Z5 - PLACEHOLDER]",
    "State of Supply: [Karnataka (29) / Inter-state as applicable]",
    isINR
      ? `Base Tuition: ₹${baseMajor} | CGST 9%: ₹${halfTax} | SGST 9%: ₹${halfTax} | Total Paid: ₹${totalMajor}`
      : `Tuition Fee: $${totalMajor} (International card transaction, zero-rated export of service)`,
    "IMPORTANT NOTICE: Tax calculation shown is a placeholder. ByteHUB administration must confirm exact GST registration, state thresholds, and invoicing compliances with a certified chartered accountant.",
  ];

  return {
    invoiceNumber,
    issueDate: paidAt.toISOString(),
    student: {
      name: studentName,
      email: studentEmail,
    },
    service: {
      programmeTitle,
      cohortCode,
    },
    financials: {
      amountSmallestUnit: amount,
      currency,
      totalFormatted: isINR ? `₹${totalMajor}` : `$${totalMajor}`,
      baseTuition: baseMajor,
      taxAmount: taxMajor,
    },
    paymentAudit: {
      orderId,
      paymentId,
      gatewayPaymentId: gatewayPaymentId || "GATEWAY_PENDING",
      status: "PAID",
    },
    legalAndTax: {
      gstNotice: gstDisclosures.join("\n"),
      accountantReminder:
        "Please confirm tax requirements, SAC codes, and GST registration details with your company accountant before issuing legally binding production invoices.",
    },
  };
}

export function buildSimpleInvoicePdfBuffer(invoice: InvoiceData): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Title (ByteHUB Tax Invoice ${invoice.invoiceNumber})
   /Creator (ByteHUB Billing Engine)
   /Producer (ByteHUB PDF Core)
   /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842]
   /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
5 0 obj
<< /Length 450 >>
stream
BT
/F1 16 Tf
50 790 Td
(BYTEHUB - TAX INVOICE & RECEIPT) Tj
/F1 10 Tf
0 -25 Td
(Invoice Number: ${invoice.invoiceNumber}) Tj
0 -15 Td
(Date: ${invoice.issueDate.slice(0, 10)}) Tj
0 -15 Td
(Student: ${invoice.student.name} <${invoice.student.email}>) Tj
0 -25 Td
(Programme: ${invoice.service.programmeTitle}) Tj
0 -15 Td
(Cohort: ${invoice.service.cohortCode}) Tj
0 -25 Td
(Total Amount Paid: ${invoice.financials.totalFormatted}) Tj
0 -15 Td
(Payment Reference: ${invoice.paymentAudit.gatewayPaymentId}) Tj
0 -35 Td
([GST DETAILS: SAC Code 999293 - Placeholder GSTIN 29AAAAA0000A1Z5]) Tj
0 -15 Td
(Base: ${invoice.financials.baseTuition} | Tax: ${invoice.financials.taxAmount} | Total: ${invoice.financials.totalFormatted}) Tj
0 -20 Td
(NOTE: Confirm tax requirements with accountant before production filing.) Tj
ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000190 00000 n 
0000000241 00000 n 
0000000300 00000 n 
0000000424 00000 n 
0000000925 00000 n 
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
1001
%%EOF`;

  return Buffer.from(content, "utf8");
}

