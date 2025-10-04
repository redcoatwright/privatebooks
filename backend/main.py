"""
Main entry point for the Bank Analyzer backend
"""

from database.manager import DatabaseManager
from parsers.csv_parser import CSVParser
from parsers.pdf_parser import PDFParser
from ml.categorizer import MLCategorizer
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
        """Get all categories"""
        try:
            categories = self.db.get_categories()
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
            transactions = self.db.get_transactions({
                'start_date': start_date,
                'end_date': end_date
            })
            
            category_totals = {}
            for txn in transactions:
                if txn['amount'] < 0:
                    cat = txn['category']
                    category_totals[cat] = category_totals.get(cat, 0) + abs(txn['amount'])
            
            categories = []
            for cat_name, total in category_totals.items():
                categories.append({
                    'name': cat_name,
                    'total': total
                })
            
            categories.sort(key=lambda x: x['total'], reverse=True)
            
            return {
                'success': True,
                'categories': categories
            }
        except Exception as e:
            logger.error(f"Get category breakdown error: {e}")
            return {'success': False, 'error': str(e)}
    
    def check_password_status(self) -> Dict[str, Any]:
        """Check if password protection is enabled"""
        try:
            password_enabled = self.db.get_setting('password_enabled')
            is_first_launch = self.db.get_setting('is_first_launch')
            
            return {
                'success': True,
                'password_enabled': password_enabled == 'true',
                'is_first_launch': is_first_launch != 'false'
            }
        except Exception as e:
            logger.error(f"Check password status error: {e}")
            return {'success': False, 'error': str(e)}
    
    def setup_password(self, password: str) -> Dict[str, Any]:
        """Set up password protection (first time)"""
        try:
            if len(password) < 8:
                return {'success': False, 'error': 'Password must be at least 8 characters'}
            
            hashed = hash_password(password)
            
            self.db.set_setting('password_hash', hashed)
            self.db.set_setting('password_enabled', 'true')
            self.db.set_setting('is_first_launch', 'false')
            
            return {'success': True, 'message': 'Password set successfully'}
        except Exception as e:
            logger.error(f"Setup password error: {e}")
            return {'success': False, 'error': str(e)}
    
    def verify_password(self, password: str) -> Dict[str, Any]:
        """Verify password for login"""
        try:
            stored_hash = self.db.get_setting('password_hash')
            
            if not stored_hash:
                return {'success': False, 'error': 'No password set'}
            
            is_valid = verify_password(password, stored_hash)
            
            if is_valid:
                return {'success': True, 'message': 'Authentication successful'}
            else:
                return {'success': False, 'error': 'Invalid password'}
        except Exception as e:
            logger.error(f"Verify password error: {e}")
            return {'success': False, 'error': str(e)}
    
    def change_password_method(self, old_password: str, new_password: str) -> Dict[str, Any]:
        """Change existing password"""
        try:
            stored_hash = self.db.get_setting('password_hash')
            
            if not stored_hash:
                return {'success': False, 'error': 'No password set'}
            
            success, result = change_password(old_password, new_password, stored_hash)
            
            if success:
                self.db.set_setting('password_hash', result)
                return {'success': True, 'message': 'Password changed successfully'}
            else:
                return {'success': False, 'error': result}
        except Exception as e:
            logger.error(f"Change password error: {e}")
            return {'success': False, 'error': str(e)}
    
    def disable_password(self, password: str) -> Dict[str, Any]:
        """Disable password protection with verification"""
        try:
            verify_result = self.verify_password(password)
            
            if not verify_result['success']:
                return {'success': False, 'error': 'Invalid password'}
            
            self.db.set_setting('password_enabled', 'false')
            self.db.set_setting('password_hash', '')
            
            return {'success': True, 'message': 'Password protection disabled'}
        except Exception as e:
            logger.error(f"Disable password error: {e}")
            return {'success': False, 'error': str(e)}
    
    def export_spending_by_category(
        self,
        start_date: str,
        end_date: str,
        format: str = 'csv',
        file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Export category breakdown to CSV or JSON
        
        Args:
            start_date: Start date for filtering (YYYY-MM-DD)
            end_date: End date for filtering (YYYY-MM-DD)
            format: Export format ('csv' or 'json')
            file_path: Optional file path to save to
        
        Returns:
            Dict with success status and data/file_path
        """
        try:
            transactions = self.db.get_transactions({
                'start_date': start_date,
                'end_date': end_date
            })
            
            category_data = {}
            total_spending = 0
            
            for txn in transactions:
                if txn['amount'] < 0:
                    cat = txn['category']
                    amount = abs(txn['amount'])
                    
                    if cat not in category_data:
                        category_data[cat] = {
                            'category': cat,
                            'total_amount': 0,
                            'transaction_count': 0
                        }
                    
                    category_data[cat]['total_amount'] += amount
                    category_data[cat]['transaction_count'] += 1
                    total_spending += amount
            
            export_data = []
            for cat_name, data in category_data.items():
                percentage = (data['total_amount'] / total_spending * 100) if total_spending > 0 else 0
                export_data.append({
                    'Category': cat_name,
                    'Total Amount': f"${data['total_amount']:.2f}",
                    'Transaction Count': data['transaction_count'],
                    'Percentage': f"{percentage:.1f}%"
                })
            
            export_data.sort(key=lambda x: float(x['Total Amount'].replace('$', '')), reverse=True)
            
            if format == 'csv':
                if not file_path:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    file_path = f"spending_by_category_{timestamp}.csv"
                
                with open(file_path, 'w', newline='', encoding='utf-8') as f:
                    if export_data:
                        writer = csv.DictWriter(f, fieldnames=['Category', 'Total Amount', 'Transaction Count', 'Percentage'])
                        writer.writeheader()
                        writer.writerows(export_data)
                
                return {
                    'success': True,
                    'file_path': file_path,
                    'format': 'csv',
                    'record_count': len(export_data)
                }
            
            elif format == 'json':
                if not file_path:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    file_path = f"spending_by_category_{timestamp}.json"
                
                export_json = {
                    'export_date': datetime.now().isoformat(),
                    'date_range': {
                        'start': start_date,
                        'end': end_date
                    },
                    'total_spending': f"${total_spending:.2f}",
                    'categories': export_data
                }
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(export_json, f, indent=2)
                
                return {
                    'success': True,
                    'file_path': file_path,
                    'format': 'json',
                    'record_count': len(export_data)
                }
            else:
                return {'success': False, 'error': f'Unsupported format: {format}'}
                
        except Exception as e:
            logger.error(f"Export spending error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_monthly_spending_by_category(
        self,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """
        Get monthly spending breakdown by category
        Returns data formatted for stacked bar chart
        
        Args:
            start_date: Start date for filtering (YYYY-MM-DD)
            end_date: End date for filtering (YYYY-MM-DD)
        
        Returns:
            Dict with success status, monthly data, and categories list
        """
        try:
            cursor = self.db.conn.execute("""
                SELECT 
                    strftime('%Y-%m', date) as month,
                    category,
                    SUM(ABS(amount)) as total
                FROM transactions
                WHERE amount < 0 
                    AND date >= ? 
                    AND date <= ?
                GROUP BY month, category
                ORDER BY month ASC, category ASC
            """, (start_date, end_date))
            
            rows = cursor.fetchall()
            
            monthly_data = {}
            all_categories_set = set()
            
            for row in rows:
                month = row['month']
                category = row['category']
                total = float(row['total'])
                
                if month not in monthly_data:
                    monthly_data[month] = {}
                monthly_data[month][category] = total
                all_categories_set.add(category)
            
            all_categories = sorted(list(all_categories_set))
            
            for month in monthly_data:
                for category in all_categories:
                    if category not in monthly_data[month]:
                        monthly_data[month][category] = 0.0
            
            return {
                'success': True,
                'data': monthly_data,
                'categories': all_categories
            }
        except Exception as e:
            logger.error(f"Get monthly spending error: {e}")
            return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    # Test the API
    api = BankAnalyzerAPI()
    print("Bank Analyzer Backend initialized")
