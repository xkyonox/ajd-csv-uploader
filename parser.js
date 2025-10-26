// CSV Parser with validation
class CSVParser {
  constructor() {
    this.expectedHeaders = ['사용 일자', '사용 항목', '사용 내역(+목적)', '사용처', '사용금액', '비고(참석자 등)'];
  }

  parse(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) {
      throw new Error('CSV 파일이 비어있습니다.');
    }

    // Detect delimiter (comma or tab)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const rows = lines.map(line => this.parseLine(line, delimiter));
    
    // Check if first row is header
    let header = rows[0];
    let dataRows = rows.slice(1);
    
    const hasHeader = this.isHeaderRow(header);
    
    if (!hasHeader) {
      // No header, use default and treat all rows as data
      header = this.expectedHeaders;
      dataRows = rows;
    }

    // Validate data
    const validationResult = this.validateData(dataRows, header);
    
    return {
      header,
      data: dataRows,
      hasHeader,
      validation: validationResult,
      totalRows: dataRows.length
    };
  }

  parseLine(line, delimiter) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    return cells;
  }

  isHeaderRow(row) {
    // Check if row contains typical header keywords
    const headerKeywords = ['일자', '항목', '내역', '사용처', '금액', '비고'];
    const matchCount = row.filter(cell => 
      headerKeywords.some(keyword => cell.includes(keyword))
    ).length;
    
    return matchCount >= 3;
  }

  validateData(rows, header) {
    const errors = [];
    const warnings = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      
      // Check if row has enough columns
      if (row.length < header.length) {
        warnings.push(`${rowNum}행: 컬럼 수가 부족합니다 (${row.length}/${header.length})`);
      }

      // Validate date
      const dateIdx = header.indexOf('사용 일자');
      if (dateIdx >= 0 && row[dateIdx]) {
        if (!this.isValidDate(row[dateIdx])) {
          errors.push(`${rowNum}행: 날짜 형식이 올바르지 않습니다 (${row[dateIdx]})`);
        }
      }

      // Validate amount
      const amtIdx = header.indexOf('사용금액');
      if (amtIdx >= 0 && row[amtIdx]) {
        if (!this.isValidAmount(row[amtIdx])) {
          errors.push(`${rowNum}행: 금액 형식이 올바르지 않습니다 (${row[amtIdx]})`);
        }
      }

      // Check for empty required fields
      const requiredFields = ['사용 일자', '사용 항목', '사용금액'];
      requiredFields.forEach(field => {
        const idx = header.indexOf(field);
        if (idx >= 0 && (!row[idx] || row[idx].trim() === '')) {
          errors.push(`${rowNum}행: ${field}이(가) 비어있습니다`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  isValidDate(dateStr) {
    const cleaned = dateStr.replace(/[-/.\s]/g, '');
    // Check for YYYYMMDD or YYYY.MM.DD formats
    return /^\d{8}$/.test(cleaned) || /^\d{4}[-.\/]\d{1,2}[-.\/]\d{1,2}$/.test(dateStr);
  }

  isValidAmount(amtStr) {
    const cleaned = amtStr.replace(/[,\s₩원KRW]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(cleaned);
  }

  // Convert parsed data to format expected by injector
  toInjectionFormat(parsedData) {
    return {
      header: parsedData.header,
      rows: parsedData.data
    };
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSVParser;
}
