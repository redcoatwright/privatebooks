"""
Main entry point for the Bank Analyzer backend
"""

from database.manager import DatabaseManager
from parsers.csv_parser import CSVParser
from parsers.pdf_parser import PDFParser
from ml.categorizer import MLCategorizer
from ml.transaction_matcher import TransactionMatcher
from utils.auth import hash_password, verify_password, change_password
from typing import Dict, Any, Optional, List
import logging
import csv
import json
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BankAnalyzerAPI:
    """Main API class that coordinates all backend operations"""
    
    def __init__(self, db_path: str = "bank_analyzer.db"):
        self.db = DatabaseManager(db_path)
        self.pdf_parser = PDFParser()
        self.csv_parser = CSVParser()
        self.ml = MLCategorizer()
        self.matcher = TransactionMatcher(self.db)
    
    def parse_csv(self, file_path: str) -> Dict[str, Any]:
        """Parse CSV and return transactions with smart categorization"""
        try:
            transactions = self.csv_parser.parse(file_path)
            
            new_transactions = []
            updated_transactions = []
            skipped_duplicates = []
            learned_applied = 0
            
            for txn in transactions:
                existing = self.matcher.find_existing_transaction(txn)
                
                if existing:
                    skipped_duplicates.append(existing)
                    logger.info(f"Skipping duplicate: {txn.get('reference_number', 'N/A')} - {txn['merchant']}")
                    continue
                
                learned_cat = self.matcher.get_learned_category(txn['merchant'])
                
                if learned_cat:
                    category, confidence = learned_cat
                    txn['category'] = category
                    txn['confidence'] = confidence
                    txn['user_modified'] = False
                    learned_applied += 1
                    logger.info(f"Applied learned category '{category}' (conf: {confidence:.2f}) to {txn['merchant']}")
                else:
                    category, confidence = self.ml.categorize(txn)
                    txn['category'] = category
                    txn['confidence'] = confidence
                    txn['user_modified'] = False
                    logger.info(f"No learned pattern for {txn['merchant']}, using dummy categorizer")
                
                self.db.save_transaction(txn)
                new_transactions.append(txn)
            
            return {
                'success': True,
                'transactions': new_transactions,
                'count': len(new_transactions),
                'duplicates_skipped': len(skipped_duplicates),
                'learned_categories_applied': learned_applied
            }
        except Exception as e:
            logger.error(f"CSV parsing error: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    def parse_pdf(self, file_path: str) -> Dict[str, Any]:
        """Parse PDF and return transactions"""
        try:
            transactions = self.pdf_parser.parse(file_path)
            
            for txn in transactions:
                if txn.get('category', 'Uncategorized') == 'Uncategorized':
                    category, confidence = self.ml.categorize(txn)
                    txn['category'] = category
                    txn['confidence'] = confidence
            
            for txn in transactions:
                self.db.save_transaction(txn)
            
            return {
                'success': True,
                'transactions': transactions,
                'count': len(transactions)
            }
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_transactions(self, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """Get transactions from database"""
        try:
            transactions = self.db.get_transactions(filters)
            return {
                'success': True,
                'transactions': transactions,
                'total': len(transactions)
            }
        except Exception as e:
            logger.error(f"Get transactions error: {e}")
            return {'success': False, 'error': str(e)}
        

    def update_transaction(self, transaction_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a transaction and learn from category changes"""
        try:
            if 'category' in updates:
                updates['confidence'] = 1.0
                updates['user_modified'] = True
                
                existing = self.db.get_transactions({'id': transaction_id})
                if existing and len(existing) > 0:
                    transaction = existing[0]
                    transaction['category'] = updates['category']
                    
                    self.matcher.learn_from_transaction(transaction)
                    logger.info(f"Learned from user update: {transaction['merchant']} -> {updates['category']}")
            
            success = self.db.update_transaction(transaction_id, updates)
            
            if success:
                return {
                    'success': True,
                    'message': 'Transaction updated successfully',
                    'learned': 'category' in updates
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to update transaction'
                }
        except Exception as e:
            logger.error(f"Update transaction error: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def bulk_update_category(self, transaction_ids: List[str], category: str) -> Dict[str, Any]:
        """Set one category on many transactions and learn from each distinct merchant"""
        try:
            category = category.strip() if isinstance(category, str) else ''
            if not category:
                return {'success': False, 'error': 'Category cannot be empty'}

            if not isinstance(transaction_ids, list) or not transaction_ids:
                return {'success': False, 'error': 'No transactions selected'}

            existing = self.db.get_transactions_by_ids(transaction_ids)
            if not existing:
                return {'success': False, 'error': 'No matching transactions found'}

            updated = self.db.bulk_update_category([t['id'] for t in existing], category)

            # Train once per distinct merchant pattern, the same way a single
            # update_transaction call does, so N rows from one merchant don't
            # inflate that pattern's match_count N times.
            learned_keys = set()
            for txn in existing:
                merchant = txn.get('merchant') or ''
                merchant_data = self.matcher.extract_merchant_tokens(merchant)
                key = (merchant_data['canonical'], merchant_data['domain'])
                if key in learned_keys:
                    continue
                learned_keys.add(key)
                self.matcher.learn_from_transaction({'merchant': merchant, 'category': category})

            logger.info(f"Bulk updated {updated} transactions -> {category} "
                        f"({len(learned_keys)} merchant patterns learned)")

            return {
                'success': True,
                'updated': updated,
                'learned_patterns': len(learned_keys),
                'message': f"Updated {updated} transaction{'' if updated == 1 else 's'}"
            }
        except Exception as e:
            logger.error(f"Bulk update category error: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    @staticmethod
    def _normalize_merchant(merchant: str) -> str:
        """Upper-case a merchant string and collapse its whitespace for comparison"""
        return ' '.join(merchant.split()).upper()

    def find_same_merchant_transactions(self, transaction_id: str,
                                        exclude_category: Optional[str] = None) -> Dict[str, Any]:
        """
        Find other transactions from the same merchant as the given transaction.

        Another transaction counts as the same merchant when its normalized
        merchant string equals the target's. Otherwise, when both sides have an
        extracted domain, the domains decide (a domain mismatch vetoes a canonical
        match); only when at least one side has no domain are the extracted
        canonical names compared. Empty values never match. Transactions already
        in exclude_category (compared case-insensitively) are left out.
        """
        try:
            found = self.db.get_transactions({'id': transaction_id})
            if not found:
                return {'success': False, 'error': 'Transaction not found'}
            target = found[0]

            target_merchant = target.get('merchant') or ''
            target_normalized = self._normalize_merchant(target_merchant)
            target_data = self.matcher.extract_merchant_tokens(target_merchant)
            target_canonical = target_data['canonical']
            target_domain = target_data['domain']

            excluded = exclude_category.strip().casefold() if exclude_category is not None else None

            token_cache: Dict[str, Dict[str, Any]] = {}
            matches = []

            for txn in self.db.get_transactions():
                if txn['id'] == target['id']:
                    continue
                if excluded is not None and (txn.get('category') or '').strip().casefold() == excluded:
                    continue

                merchant = txn.get('merchant') or ''
                if merchant not in token_cache:
                    token_cache[merchant] = self.matcher.extract_merchant_tokens(merchant)
                merchant_data = token_cache[merchant]

                cand_domain = merchant_data['domain']
                if target_normalized and self._normalize_merchant(merchant) == target_normalized:
                    same_merchant = True
                elif target_domain and cand_domain:
                    # Differing domains veto a canonical match (APPLE.COM/BILL vs ADOBE.COM/BILL)
                    same_merchant = cand_domain == target_domain
                else:
                    same_merchant = bool(target_canonical) and merchant_data['canonical'] == target_canonical
                if not same_merchant:
                    continue

                matches.append({
                    'id': txn['id'],
                    'date': txn.get('date'),
                    'merchant': merchant,
                    'description': txn.get('description'),
                    'amount': txn.get('amount'),
                    'category': txn.get('category'),
                    'user_modified': bool(txn.get('user_modified'))
                })

            matches.sort(key=lambda t: t['date'] or '', reverse=True)

            return {
                'success': True,
                'merchant': target_merchant,
                'transactions': matches,
                'total': len(matches)
            }
        except Exception as e:
            logger.error(f"Find same merchant transactions error: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def delete_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """Delete a transaction"""
        try:
            query = "DELETE FROM transactions WHERE id = ?"
            self.db.conn.execute(query, (transaction_id,))
            self.db.conn.commit()
            
            return {
                'success': True,
                'message': 'Transaction deleted successfully'
            }
        except Exception as e:
            logger.error(f"Delete transaction error: {e}")
            return {'success': False, 'error': str(e)}

    
    def get_spending_summary(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Calculate spending analytics"""
        try:
            transactions = self.db.get_transactions({
                'start_date': start_date,
                'end_date': end_date
            })
            
            # Calculate summary
            total_spending = sum(abs(t['amount']) for t in transactions if t['amount'] < 0)
            total_income = sum(t['amount'] for t in transactions if t['amount'] > 0)
            
            # Category breakdown
            categories = {}
            for t in transactions:
                if t['amount'] < 0:
                    cat = t['category']
                    categories[cat] = categories.get(cat, 0) + abs(t['amount'])
            
            top_category = max(categories.items(), key=lambda x: x[1])[0] if categories else None
            
            return {
                'success': True,
                'summary': {
                    'totalSpending': total_spending,
                    'totalIncome': total_income,
                    'netCashFlow': total_income - total_spending,
                    'transactionCount': len(transactions),
                    'topCategory': top_category
                }
            }
        except Exception as e:
            logger.error(f"Get spending summary error: {e}")
            return {'success': False, 'error': str(e)}
        
    def get_categories(self) -> Dict[str, Any]:
        """Get all available categories"""
        try:
            categories = self.db.get_all_categories()
            return {
                'success': True,
                'categories': categories
            }
        except Exception as e:
            logger.error(f"Get categories error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_category_breakdown(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get spending breakdown by category"""
        try:
            category_spending = self.db.get_category_spending(start_date, end_date)
            
            # Format for frontend
            categories = [
                {'name': cat, 'value': amount}
                for cat, amount in category_spending.items()
            ]
            
            return {
                'success': True,
                'categories': categories
            }
        except Exception as e:
            logger.error(f"Get category breakdown error: {e}")
            return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    # Test the API
    api = BankAnalyzerAPI()
    print("Bank Analyzer Backend initialized")
