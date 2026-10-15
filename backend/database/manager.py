"""Database operations manager with dynamic categories"""

import sqlite3
from typing import Dict, List, Optional, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    # Max ids bound into a single "IN (...)" list. Older SQLite builds cap a
    # statement at 999 host parameters, so stay comfortably below that.
    MAX_IN_PARAMS = 500

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
                reference_number TEXT UNIQUE,
                date TEXT,
                merchant TEXT,
                description TEXT,
                amount REAL,
                category TEXT,
                confidence REAL DEFAULT 0.0,
                user_modified BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS learned_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_pattern TEXT NOT NULL,
                category TEXT NOT NULL,
                match_count INTEGER DEFAULT 1,
                pattern_type TEXT DEFAULT 'canonical',
                last_matched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(merchant_pattern, pattern_type)
            );
            
            CREATE INDEX IF NOT EXISTS idx_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);
            CREATE INDEX IF NOT EXISTS idx_merchant ON transactions(merchant);
            CREATE INDEX IF NOT EXISTS idx_reference ON transactions(reference_number);
            CREATE INDEX IF NOT EXISTS idx_user_modified ON transactions(user_modified);
            CREATE INDEX IF NOT EXISTS idx_merchant_pattern ON learned_patterns(merchant_pattern);
            CREATE INDEX IF NOT EXISTS idx_pattern_type ON learned_patterns(pattern_type);
            
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
            category = transaction.get('category', 'Uncategorized')
            if category:
                self.ensure_category_exists(category)
            
            self.conn.execute("""
                INSERT OR REPLACE INTO transactions 
                (id, reference_number, date, merchant, description, amount, category, confidence, user_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                transaction['id'],
                transaction.get('reference_number'),
                transaction['date'],
                transaction['merchant'],
                transaction['description'],
                transaction['amount'],
                category,
                transaction.get('confidence', 0.0),
                transaction.get('user_modified', False)
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
            if 'id' in filters:
                query += " AND id = ?"
                params.append(filters['id'])
            if 'start_date' in filters:
                query += " AND date >= ?"
                params.append(filters['start_date'])
            if 'end_date' in filters:
                query += " AND date <= ?"
                params.append(filters['end_date'])
            if 'category' in filters:
                query += " AND category = ?"
                params.append(filters['category'])
            if 'user_modified' in filters:
                query += " AND user_modified = ?"
                params.append(filters['user_modified'])
        
        query += " ORDER BY date DESC"

        cursor = self.conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_transactions_by_ids(self, transaction_ids: List[str]) -> List[Dict]:
        """Retrieve the transactions whose ids are in the list (unknown ids are skipped)"""
        unique_ids = list(dict.fromkeys(transaction_ids))
        results: List[Dict] = []

        for start in range(0, len(unique_ids), self.MAX_IN_PARAMS):
            chunk = unique_ids[start:start + self.MAX_IN_PARAMS]
            placeholders = ', '.join('?' for _ in chunk)
            cursor = self.conn.execute(
                f"SELECT * FROM transactions WHERE id IN ({placeholders})",
                chunk
            )
            results.extend(dict(row) for row in cursor.fetchall())

        return results

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

    def bulk_update_category(self, transaction_ids: List[str], category: str) -> int:
        """
        Set the same category on many transactions and mark them as user-set.

        Every chunk runs inside one database transaction with a single commit,
        so either all rows are updated or (on error) none are.
        Returns the number of rows updated.
        """
        self.ensure_category_exists(category)

        unique_ids = list(dict.fromkeys(transaction_ids))
        updated = 0

        try:
            for start in range(0, len(unique_ids), self.MAX_IN_PARAMS):
                chunk = unique_ids[start:start + self.MAX_IN_PARAMS]
                placeholders = ', '.join('?' for _ in chunk)
                cursor = self.conn.execute(
                    f"UPDATE transactions "
                    f"SET category = ?, confidence = 1.0, user_modified = 1 "
                    f"WHERE id IN ({placeholders})",
                    [category, *chunk]
                )
                updated += cursor.rowcount
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

        return updated

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
    
    def find_duplicate_transaction(self, reference_number: str) -> Optional[Dict]:
        """Check if transaction already exists by reference number"""
        try:
            cursor = self.conn.execute(
                "SELECT * FROM transactions WHERE reference_number = ?",
                (reference_number,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error finding duplicate: {e}")
            return None
    
    def learn_from_user_category(self, merchant_pattern: str, category: str, 
                                pattern_type: str = 'canonical') -> None:
        """Store or update a learned pattern when user updates a category"""
        try:
            cursor = self.conn.execute(
                "SELECT id FROM learned_patterns WHERE merchant_pattern = ? AND pattern_type = ?",
                (merchant_pattern, pattern_type)
            )
            existing = cursor.fetchone()
            
            if existing:
                self.conn.execute("""
                    UPDATE learned_patterns 
                    SET category = ?, 
                        match_count = match_count + 1,
                        last_matched = CURRENT_TIMESTAMP
                    WHERE merchant_pattern = ? AND pattern_type = ?
                """, (category, merchant_pattern, pattern_type))
                logger.info(f"Updated learned pattern: {merchant_pattern} ({pattern_type}) -> {category}")
            else:
                self.conn.execute("""
                    INSERT INTO learned_patterns 
                    (merchant_pattern, category, match_count, pattern_type)
                    VALUES (?, ?, 1, ?)
                """, (merchant_pattern, category, pattern_type))
                logger.info(f"Added new learned pattern: {merchant_pattern} ({pattern_type}) -> {category}")
            
            self.conn.commit()
        except Exception as e:
            logger.error(f"Error learning pattern: {e}")
    
    def get_learned_category(self, merchant_pattern: str) -> Optional[Tuple[str, int]]:
        """Get category from learned patterns by canonical name"""
        try:
            cursor = self.conn.execute("""
                SELECT category, match_count 
                FROM learned_patterns 
                WHERE merchant_pattern = ? AND pattern_type = 'canonical'
                ORDER BY match_count DESC
                LIMIT 1
            """, (merchant_pattern,))
            
            row = cursor.fetchone()
            if row:
                return (row['category'], row['match_count'])
            return None
        except Exception as e:
            logger.error(f"Error getting learned category: {e}")
            return None
    
    def get_learned_category_by_domain(self, domain: str) -> Optional[Tuple[str, int]]:
        """Get category from learned patterns by domain"""
        try:
            cursor = self.conn.execute("""
                SELECT category, match_count 
                FROM learned_patterns 
                WHERE merchant_pattern = ? AND pattern_type = 'domain'
                ORDER BY match_count DESC
                LIMIT 1
            """, (domain,))
            
            row = cursor.fetchone()
            if row:
                return (row['category'], row['match_count'])
            return None
        except Exception as e:
            logger.error(f"Error getting learned category by domain: {e}")
            return None
    
    def get_all_learned_patterns(self) -> List[Dict[str, Any]]:
        """Get all learned patterns for fuzzy matching"""
        try:
            cursor = self.conn.execute("""
                SELECT merchant_pattern, category, match_count, pattern_type
                FROM learned_patterns
                ORDER BY match_count DESC
            """)
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error getting all patterns: {e}")
            return []
    
    def increment_pattern_match(self, merchant_pattern: str, pattern_type: str = 'canonical') -> None:
        """Increment match count when pattern is successfully used"""
        try:
            self.conn.execute("""
                UPDATE learned_patterns 
                SET match_count = match_count + 1,
                    last_matched = CURRENT_TIMESTAMP
                WHERE merchant_pattern = ? AND pattern_type = ?
            """, (merchant_pattern, pattern_type))
            self.conn.commit()
        except Exception as e:
            logger.error(f"Error incrementing pattern match: {e}")
