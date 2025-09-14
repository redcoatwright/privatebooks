"""PDF bank statement parser"""

import re
import secrets
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Note: PDF parsing requires additional libraries
# Install with: pip install PyPDF2 pdfplumber tabula-py

class PDFParser:
    def __init__(self):
        self.has_pdf_libs = False
        try:
            import PyPDF2
            import pdfplumber
            self.has_pdf_libs = True
        except ImportError:
            logger.warning("PDF libraries not installed. Install with: pip install PyPDF2 pdfplumber")
    
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse PDF bank statement"""
        if not self.has_pdf_libs:
            raise ImportError("PDF parsing libraries not installed")
        
        transactions = []
        
        try:
            import pdfplumber
            
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        # Parse text for transactions
                        page_transactions = self._extract_transactions_from_text(text)
                        transactions.extend(page_transactions)
            
            logger.info(f"Parsed {len(transactions)} transactions from PDF")
            return transactions
            
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            raise
    
    def _extract_transactions_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract transactions from PDF text"""
        transactions = []
        lines = text.split('\n')
        
        for line in lines:
            # Look for transaction patterns (date and amount)
            if self._is_transaction_line(line):
                transaction = self._parse_transaction_line(line)
                if transaction:
                    transactions.append(transaction)
        
        return transactions
    
    def _is_transaction_line(self, line: str) -> bool:
        """Check if line contains transaction data"""
        has_date = bool(re.search(r'\d{1,2}/\d{1,2}', line))
        has_amount = bool(re.search(r'[\d,]+\.\d{2}', line))
        return has_date and has_amount
    
    def _parse_transaction_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse a single transaction line"""
        try:
            # Extract date
            date_match = re.search(r'(\d{1,2}/\d{1,2}(?:/\d{2,4})?)', line)
            if not date_match:
                return None
            
            # Extract amount
            amount_matches = re.findall(r'([-]?[\d,]+\.\d{2})', line)
            if not amount_matches:
                return None
            
            amount = float(amount_matches[-1].replace(',', ''))
            
            # Extract description
            description = line[:50].strip()
            
            return {
                'id': f"txn_{secrets.token_hex(8)}",
                'date': date_match.group(1),
                'merchant': description[:30],
                'description': description,
                'amount': amount,
                'category': 'Uncategorized',
                'confidence': 0.0
            }
        except Exception:
            return None
