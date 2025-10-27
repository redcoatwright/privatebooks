"""Database operations manager with dynamic categories"""

import sqlite3
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()
    
    def _init_schema(self):
        """Create tables if they don't exist"""
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                date TEXT,
                merchant TEXT,
                description TEXT,
                amount REAL,
                category TEXT,
                confidence REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);
            CREATE INDEX IF NOT EXISTS idx_merchant ON transactions(merchant);
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        self.conn.commit()
    
    def ensure_category_exists(self, category_name: str) -> None:
        """Add category if it doesn't exist"""
        if category_name and category_name.strip():
            try:
                self.conn.execute(
                    "INSERT OR IGNORE INTO categories (name) VALUES (?)",
                    (category_name.strip(),)
                )
                self.conn.commit()
            except Exception as e:
                logger.error(f"Error adding category {category_name}: {e}")
    
    def get_all_categories(self) -> List[str]:
        """Get all unique categories from both the categories table and transactions"""
        cursor = self.conn.execute("""
            SELECT DISTINCT name FROM (
                SELECT name FROM categories
                UNION
                SELECT DISTINCT category as name FROM transactions 
                WHERE category IS NOT NULL AND category != ''
            )
            ORDER BY name
        """)
        return [row['name'] for row in cursor.fetchall()]
    
    def save_transaction(self, transaction: Dict[str, Any]) -> bool:
        """Save a transaction to database"""
        try:
            # Ensure the category exists
            category = transaction.get('category', 'Uncategorized')
            if category:
                self.ensure_category_exists(category)
            
            self.conn.execute("""
                INSERT OR REPLACE INTO transactions 
                (id, date, merchant, description, amount, category, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                transaction['id'],
                transaction['date'],
                transaction['merchant'],
                transaction['description'],
                transaction['amount'],
                category,
                transaction.get('confidence', 0.0)
            ))
            self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Database save error: {e}")
            return False
    
    def get_transactions(self, filters: Optional[Dict] = None) -> List[Dict]:
        """Retrieve transactions with optional filters"""
        query = "SELECT * FROM transactions WHERE 1=1"
        params = []
        
        if filters:
            if 'start_date' in filters:
                query += " AND date >= ?"
                params.append(filters['start_date'])
            if 'end_date' in filters:
                query += " AND date <= ?"
                params.append(filters['end_date'])
            if 'category' in filters:
                query += " AND category = ?"
                params.append(filters['category'])
        
        query += " ORDER BY date DESC"
        
        cursor = self.conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    
    def update_transaction(self, transaction_id: str, updates: Dict) -> bool:
        """Update a transaction"""
        try:
            # If updating category, ensure it exists
            if 'category' in updates:
                self.ensure_category_exists(updates['category'])
            
            set_clauses = []
            params = []
            
            for field, value in updates.items():
                if field != 'id':
                    set_clauses.append(f"{field} = ?")
                    params.append(value)
            
            params.append(transaction_id)
            query = f"UPDATE transactions SET {', '.join(set_clauses)} WHERE id = ?"
            
            self.conn.execute(query, params)
            self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Update error: {e}")
            return False
    
    def get_category_spending(self, start_date: str, end_date: str) -> Dict[str, float]:
        """Get spending breakdown by category"""
        cursor = self.conn.execute("""
            SELECT category, SUM(ABS(amount)) as total
            FROM transactions
            WHERE amount < 0 
                AND date >= ? 
                AND date <= ?
            GROUP BY category
            ORDER BY total DESC
        """, (start_date, end_date))
        
        return {row['category']: row['total'] for row in cursor.fetchall()}
