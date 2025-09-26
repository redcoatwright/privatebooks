"""
Main entry point for the Bank Analyzer backend
"""

from database.manager import DatabaseManager
from parsers.csv_parser import CSVParser
from parsers.pdf_parser import PDFParser
from ml.categorizer import MLCategorizer
from typing import Dict, Any, Optional, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BankAnalyzerAPI:
    """Main API class that coordinates all backend operations"""
    
    def __init__(self, db_path: str = "bank_analyzer.db"):
        self.db = DatabaseManager(db_path)
        self.pdf_parser = PDFParser()
        self.csv_parser = CSVParser()
        self.ml = MLCategorizer()
    
    def parse_csv(self, file_path: str) -> Dict[str, Any]:
        """Parse CSV and return transactions"""
        try:
            # Parse the file
            transactions = self.csv_parser.parse(file_path)
            
            # Auto-categorize if needed
            for txn in transactions:
                if txn.get('category', 'Uncategorized') == 'Uncategorized':
                    category, confidence = self.ml.categorize(txn)
                    txn['category'] = category
                    txn['confidence'] = confidence
            
            # Save to database
            for txn in transactions:
                self.db.save_transaction(txn)
            
            return {
                'success': True,
                'transactions': transactions,
                'count': len(transactions)
            }
        except Exception as e:
            logger.error(f"CSV parsing error: {e}")
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
        """Update a transaction (mainly for category updates)"""
        try:
            # If category is being updated, recalculate confidence
            if 'category' in updates:
                updates['confidence'] = 1.0  # User-corrected categories have high confidence
            
            success = self.db.update_transaction(transaction_id, updates)
            
            if success:
                return {
                    'success': True,
                    'message': 'Transaction updated successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to update transaction'
                }
        except Exception as e:
            logger.error(f"Update transaction error: {e}")
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
