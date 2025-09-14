"""Utility functions"""

import re
from datetime import datetime
from typing import Any


def clean_amount(amount_str: str) -> float:
    """Parse amount from various string formats"""
    if isinstance(amount_str, (int, float)):
        return float(amount_str)
    
    # Remove currency symbols and commas
    cleaned = str(amount_str).replace('$', '').replace(',', '').strip()
    
    # Handle parentheses for negative amounts
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]
    
    try:
        return float(cleaned)
    except:
        return 0.0


def normalize_date(date_str: str) -> str:
    """Convert various date formats to ISO format (YYYY-MM-DD)"""
    formats = [
        '%m/%d/%Y',
        '%m/%d/%y',
        '%Y-%m-%d',
        '%d/%m/%Y',
        '%m-%d-%Y'
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except:
            continue
    
    return date_str


def extract_merchant_name(description: str) -> str:
    """Extract clean merchant name from transaction description"""
    # Remove common transaction prefixes
    prefixes = [
        'PURCHASE', 'POS', 'DEBIT', 'CARD', 'PAYMENT',
        'WL *', 'SQSP* ', 'ABC*'
    ]
    
    cleaned = description.upper()
    for prefix in prefixes:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    
    # Remove trailing transaction codes
    cleaned = re.sub(r'#\d+.*$', '', cleaned)
    cleaned = re.sub(r'\d{10,}.*$', '', cleaned)
    
    # Take first few words
    words = cleaned.split()[:3]
    return ' '.join(words).title() if words else description[:30]
