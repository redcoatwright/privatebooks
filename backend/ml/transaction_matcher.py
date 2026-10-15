"""
Enhanced transaction matching with intelligent merchant extraction and token-based comparison
"""

import re
from typing import Dict, Any, Optional, Tuple, List, Set
from difflib import SequenceMatcher
import logging

logger = logging.getLogger(__name__)


class TransactionMatcher:
    """
    Sophisticated transaction matching using token-based analysis.
    Handles real-world credit card merchant variations.
    """
    
    MERCHANT_PREFIXES = [
        'WL *', 'SQSP*', 'ABC*', 'TST*', 'SQ *', 'SP *',
        'PURCHASE', 'POS', 'DEBIT', 'CARD', 'PAYMENT TO',
        'PAYMENT ', 'PMT*'
    ]
    
    NOISE_PATTERNS = [
        r'\d{3}-?\d{3}-?\d{4}',
        r'\d{10,}',
        r'#\d+',
        r'\b[A-Z]{2}\s*$',
        r'\b\d{5}\b',
    ]
    
    def __init__(self, db_manager):
        self.db = db_manager
    
    def extract_merchant_tokens(self, raw_merchant: str) -> Dict[str, Any]:
        """
        Extract meaningful tokens from raw merchant string.
        
        Examples:
            "ABC*REPUBLIC FITNESS 617-5471229 MA" 
            -> {canonical: "REPUBLIC FITNESS", tokens: ["REPUBLIC", "FITNESS"], domain: None}
            
            "ANTHROPIC ANTHROPIC.COMCA"
            -> {canonical: "ANTHROPIC", tokens: ["ANTHROPIC"], domain: "anthropic.com"}
        
        Returns:
            {
                'canonical': 'REPUBLIC FITNESS',
                'domain': 'anthropic.com',
                'tokens': ['REPUBLIC', 'FITNESS'],
                'raw': original string
            }
        """
        result = {
            'canonical': '',
            'domain': None,
            'tokens': [],
            'raw': raw_merchant
        }
        
        cleaned = raw_merchant.upper()
        
        domain_match = re.search(r'([A-Z0-9-]+\.(COM|NET|ORG|IO|CO))', cleaned)
        if domain_match:
            result['domain'] = domain_match.group(1).lower()
            cleaned = cleaned.replace(domain_match.group(1), '')
        
        for prefix in self.MERCHANT_PREFIXES:
            if cleaned.startswith(prefix.upper()):
                cleaned = cleaned[len(prefix):].strip()
                break
        
        for pattern in self.NOISE_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned)
        
        cleaned = re.sub(r'[^A-Z0-9\s]', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        tokens = [t for t in cleaned.split() if len(t) > 2]
        result['tokens'] = tokens
        
        result['canonical'] = ' '.join(tokens[:3]) if tokens else cleaned
        
        return result
    
    def find_existing_transaction(self, transaction: Dict[str, Any]) -> Optional[Dict]:
        """
        Find if this transaction already exists.
        Uses multiple strategies in order of reliability:
        1. Exact reference number match
        2. Date + Amount + Merchant match
        """
        if transaction.get('reference_number'):
            existing = self.db.find_duplicate_transaction(
                transaction['reference_number']
            )
            if existing:
                logger.info(f"Exact match by reference: {transaction['reference_number']}")
                return existing
        
        existing = self._match_by_date_amount_merchant(transaction)
        if existing:
            logger.info(f"Match by date+amount+merchant: {transaction['merchant']}")
            return existing
        
        return None
    
    def _match_by_date_amount_merchant(self, transaction: Dict[str, Any]) -> Optional[Dict]:
        """
        Match by exact date and amount, with intelligent merchant comparison.
        This catches duplicates even if reference numbers differ.
        """
        candidates = self.db.get_transactions({
            'start_date': transaction['date'],
            'end_date': transaction['date']
        })
        
        for candidate in candidates:
            if abs(candidate['amount'] - transaction['amount']) > 0.01:
                continue
            
            if self._merchants_match(transaction['merchant'], candidate['merchant']):
                return candidate
        
        return None
    
    def _merchants_match(self, merchant1: str, merchant2: str, threshold: float = 0.75) -> bool:
        """
        Determine if two merchant strings refer to the same merchant.
        Uses multiple strategies for robust matching.
        
        Examples that should match:
            "ABC*REPUBLIC FITNESS 617-5471229 MA" == "REPUBLIC FITNESS GYM"
            "ANTHROPIC ANTHROPIC.COMCA" == "ANTHROPIC.COM SUBSCRIPTION"
            "Amazon web services aws.amazon.coWA" == "AWS AMAZON.COM"
        """
        tokens1 = self.extract_merchant_tokens(merchant1)
        tokens2 = self.extract_merchant_tokens(merchant2)
        
        if tokens1['domain'] and tokens2['domain']:
            if tokens1['domain'] == tokens2['domain']:
                return True
            
            d1_base = tokens1['domain'].split('.')[0]
            d2_base = tokens2['domain'].split('.')[0]
            if d1_base == d2_base and len(d1_base) > 3:
                return True
        
        set1 = set(tokens1['tokens'])
        set2 = set(tokens2['tokens'])
        
        if not set1 or not set2:
            similarity = SequenceMatcher(None, 
                                        tokens1['canonical'], 
                                        tokens2['canonical']).ratio()
            return similarity >= threshold
        
        intersection = set1 & set2
        union = set1 | set2
        jaccard = len(intersection) / len(union) if union else 0
        
        if jaccard >= 0.5:
            return True
        
        smaller = set1 if len(set1) <= len(set2) else set2
        larger = set2 if len(set1) <= len(set2) else set1
        
        if smaller and smaller.issubset(larger):
            return True
        
        similarity = SequenceMatcher(None, 
                                    tokens1['canonical'], 
                                    tokens2['canonical']).ratio()
        return similarity >= threshold
    
    def get_learned_category(self, merchant: str) -> Optional[Tuple[str, float]]:
        """
        Get category from learned patterns using intelligent matching.
        
        Tries multiple strategies:
        1. Exact canonical name match
        2. Domain match
        3. Fuzzy token-based match
        
        Returns (category, confidence) or None.
        """
        merchant_data = self.extract_merchant_tokens(merchant)
        
        result = self.db.get_learned_category(merchant_data['canonical'])
        if result:
            category, match_count = result
            confidence = self._calculate_confidence(match_count, exact=True)
            logger.info(f"Exact learned match: {merchant_data['canonical']} -> {category}")
            return (category, confidence)
        
        if merchant_data['domain']:
            result = self.db.get_learned_category_by_domain(merchant_data['domain'])
            if result:
                category, match_count = result
                confidence = self._calculate_confidence(match_count, exact=True)
                logger.info(f"Domain learned match: {merchant_data['domain']} -> {category}")
                return (category, confidence)
        
        all_patterns = self.db.get_all_learned_patterns()
        
        for pattern_data in all_patterns:
            if self._merchants_match(merchant, pattern_data['merchant_pattern'], threshold=0.7):
                category = pattern_data['category']
                match_count = pattern_data['match_count']
                confidence = self._calculate_confidence(match_count, exact=False)
                logger.info(f"Fuzzy learned match: {merchant} -> {category} "
                          f"(via {pattern_data['merchant_pattern']})")
                return (category, confidence)
        
        return None
    
    def _calculate_confidence(self, match_count: int, exact: bool = True) -> float:
        """
        Calculate confidence score based on match count and match type.
        
        Exact matches: 0.85-0.95
        Fuzzy matches: 0.65-0.85
        
        Confidence increases with more matches (up to 5 matter).
        """
        base = 0.85 if exact else 0.65
        increment = 0.02 * min(match_count - 1, 5)
        return min(0.95, base + increment)
    
    def learn_from_transaction(self, transaction: Dict[str, Any]) -> None:
        """
        Learn patterns from a user-categorized transaction.
        Stores multiple searchable patterns for better future matching.
        """
        merchant_data = self.extract_merchant_tokens(transaction['merchant'])
        category = transaction['category']
        
        self.db.learn_from_user_category(
            merchant_pattern=merchant_data['canonical'],
            category=category,
            pattern_type='canonical'
        )
        
        if merchant_data['domain']:
            self.db.learn_from_user_category(
                merchant_pattern=merchant_data['domain'],
                category=category,
                pattern_type='domain'
            )
        
        logger.info(f"Learned patterns for {transaction['merchant']}: "
                   f"canonical='{merchant_data['canonical']}', "
                   f"domain='{merchant_data['domain']}'")
