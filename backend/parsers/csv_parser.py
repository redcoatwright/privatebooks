"""CSV file parser"""

import csv
import pandas as pd
from typing import List, Dict, Any
import secrets
from datetime import datetime
import re
import logging

logger = logging.getLogger(__name__)


class CSVParser:
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse CSV file and return transaction list"""
        transactions = []
        
        try:
            # Read CSV with pandas for flexibility
            df = pd.read_csv(file_path)
            
            # Clean column names
            df.columns = df.columns.str.strip()
            
            column_mapping = self._detect_columns(df.columns)
            
            for _, row in df.iterrows():
                ref_num = None
                if 'reference_number' in column_mapping:
                    ref_num = str(row[column_mapping['reference_number']])
                
                transaction = {
                    'id': f"txn_{secrets.token_hex(8)}",
                    'reference_number': ref_num,
                    'date': self._parse_date(row[column_mapping['date']]),
                    'merchant': self._extract_merchant(row[column_mapping['merchant']]),
                    'description': str(row[column_mapping['merchant']]),
                    'amount': float(row[column_mapping['amount']]),
                    'category': 'Uncategorized',
                    'confidence': 0.0,
                    'user_modified': False
                }
                
                transactions.append(transaction)
            
            logger.info(f"Parsed {len(transactions)} transactions from CSV")
            return transactions
            
        except Exception as e:
            logger.error(f"CSV parsing error: {e}")
            raise
    
    def _detect_columns(self, columns) -> Dict[str, str]:
        """Auto-detect which columns contain what data"""
        mapping = {}
        
        for col in columns:
            col_lower = col.lower()
            if 'date' in col_lower or 'posted' in col_lower:
                mapping['date'] = col
            elif 'payee' in col_lower or 'merchant' in col_lower or 'description' in col_lower:
                mapping['merchant'] = col
            elif 'amount' in col_lower:
                mapping['amount'] = col
            elif 'reference' in col_lower or 'ref' in col_lower:
                mapping['reference_number'] = col
        
        return mapping
    
    def _parse_date(self, date_str: str) -> str:
        """Convert date to ISO format"""
        try:
            dt = pd.to_datetime(date_str)
            return dt.strftime('%Y-%m-%d')
        except:
            return str(date_str)
    
    def _extract_merchant(self, description: str) -> str:
        """Clean up merchant name from credit card description"""
        cleaned = str(description).strip()
        
        cleaned = re.sub(r'"', '', cleaned)
        
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        return cleaned[:100]
