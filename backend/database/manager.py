"""Database operations manager"""

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
                color TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);
            CREATE INDEX IF NOT EXISTS idx_merchant ON transactions(merchant);
        """)
        self.conn.commit()
        self._init_default_categories()
    
    def _init_default_categories(self):
        """Insert default categories"""
        categories = [
            ('AI Services', '#8b5cf6'),
            ('Cloud Services', '#3b82f6'),
            ('Entertainment', '#ec4899'),
            ('Health & Fitness', '#10b981'),
            ('Transportation', '#f59e0b'),
            ('Food & Dining', '#ef4444'),
            ('Shopping', '#06b6d4'),
            ('Services', '#84cc16'),
            ('Insurance', '#f97316'),
            ('Parking', '#64748b'),
            ('Uncategorized', '#9ca3af')
        ]
        
        for name, color in categories:
            self.conn.execute(
                "INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)",
                (name, color)
            )
        self.conn.commit()
    
    def save_transaction(self, transaction: Dict[str, Any]) -> bool:
        """Save a transaction to database"""
        try:
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
                transaction.get('category', 'Uncategorized'),
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
