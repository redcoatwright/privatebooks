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
