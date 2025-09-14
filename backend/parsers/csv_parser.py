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
            
            # Map columns
            column_mapping = self._detect_columns(df.columns)
            
            for _, row in df.iterrows():
                transaction = {
                    'id': f"txn_{secrets.token_hex(8)}",
                    'date': self._parse_date(row[column_mapping['date']]),
                    'merchant': self._extract_merchant(row[column_mapping['merchant']]),
                    'description': str(row[column_mapping['merchant']]),
                    'amount': float(row[column_mapping['amount']]),
                    'category': 'Uncategorized',
                    'confidence': 0.0
                }
                
                # Use existing category if available
                if 'category' in column_mapping and column_mapping['category'] in row:
                    existing_cat = row[column_mapping['category']]
                    if pd.notna(existing_cat):
                        transaction['category'] = str(existing_cat)
                        transaction['confidence'] = 1.0
                
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
            elif 'category' in col_lower:
                mapping['category'] = col
        
        return mapping
    
    def _parse_date(self, date_str: str) -> str:
        """Convert date to ISO format"""
        try:
            dt = pd.to_datetime(date_str)
            return dt.strftime('%Y-%m-%d')
        except:
            return str(date_str)
    
    def _extract_merchant(self, description: str) -> str:
        """Clean up merchant name from description"""
        # Remove quotes and extra spaces
        cleaned = str(description)
        cleaned = re.sub(r'"', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove common prefixes
        prefixes = ['WL *', 'SQSP* ', 'ABC*']
        for prefix in prefixes:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):]
        
        # Take first few meaningful words
        parts = cleaned.split()
        if parts:
            # Remove trailing location codes
            merchant = ' '.join(parts[:3])
            merchant = re.sub(r'\s+[A-Z]{2}\s*$', '', merchant)
            return merchant.strip()
        
        return cleaned[:50]
