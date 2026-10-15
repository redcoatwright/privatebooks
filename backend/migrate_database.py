#!/usr/bin/env python3
"""
Database migration script to add enhanced matching features
"""

import sqlite3
import sys
import os

def migrate_database(db_path='bank_analyzer.db'):
    """Add new fields and tables to existing database"""
    print(f"Migrating database: {db_path}")
    
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup"
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✓ Backup created: {backup_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("  ⚠ transactions table does not exist - will be created by DatabaseManager")
            print("  Creating learned_patterns table only...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learned_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    merchant_pattern TEXT NOT NULL,
                    category TEXT NOT NULL,
                    match_count INTEGER DEFAULT 1,
                    pattern_type TEXT DEFAULT 'canonical',
                    last_matched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(merchant_pattern, pattern_type)
                )
            """)
            print("  ✓ learned_patterns table created")
            
            indexes = [
                ("idx_merchant_pattern", "learned_patterns", "merchant_pattern"),
                ("idx_pattern_type", "learned_patterns", "pattern_type")
            ]
            
            for idx_name, table, column in indexes:
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS {idx_name} 
                    ON {table}({column})
                """)
                print(f"  ✓ Index {idx_name} created")
            
            conn.commit()
            print("\n✓ Migration completed successfully!")
            conn.close()
            return
        print("Adding reference_number column...")
        try:
            cursor.execute("""
                ALTER TABLE transactions 
                ADD COLUMN reference_number TEXT
            """)
            print("  ✓ reference_number column added")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠ reference_number column already exists")
            else:
                raise
        
        print("Adding user_modified column...")
        try:
            cursor.execute("""
                ALTER TABLE transactions 
                ADD COLUMN user_modified BOOLEAN DEFAULT 0
            """)
            print("  ✓ user_modified column added")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠ user_modified column already exists")
            else:
                raise
        
        print("Creating learned_patterns table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learned_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_pattern TEXT NOT NULL,
                category TEXT NOT NULL,
                match_count INTEGER DEFAULT 1,
                pattern_type TEXT DEFAULT 'canonical',
                last_matched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(merchant_pattern, pattern_type)
            )
        """)
        print("  ✓ learned_patterns table created")
        
        print("Creating indexes...")
        indexes = [
            ("idx_reference", "transactions", "reference_number"),
            ("idx_user_modified", "transactions", "user_modified"),
            ("idx_merchant_pattern", "learned_patterns", "merchant_pattern"),
            ("idx_pattern_type", "learned_patterns", "pattern_type")
        ]
        
        for idx_name, table, column in indexes:
            try:
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS {idx_name} 
                    ON {table}({column})
                """)
                print(f"  ✓ Index {idx_name} created")
            except sqlite3.OperationalError as e:
                print(f"  ⚠ Index {idx_name}: {e}")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        print("\nNew features enabled:")
        print("  • Reference number duplicate detection")
        print("  • User-modified category tracking")
        print("  • Token-based pattern learning (canonical + domain)")
        print("  • Enhanced fuzzy merchant matching")
        
    except Exception as e:
        print(f"\n✗ Migration error: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'bank_analyzer.db'
    migrate_database(db_path)
