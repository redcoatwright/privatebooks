"""Cryptographic utilities for database encryption"""

import hashlib
import os
import json
from typing import Tuple


def generate_salt() -> bytes:
    """Generate a random salt for key derivation"""
    return os.urandom(32)


def derive_encryption_key(password: str, salt: bytes) -> bytes:
    """
    Derive encryption key from user password using PBKDF2
    
    Args:
        password: User password
        salt: Random salt (should be stored separately)
    
    Returns:
        Derived encryption key (32 bytes)
    """
    return hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    )


def save_salt(salt: bytes, config_path: str = '.abstra/config.json') -> bool:
    """
    Save salt to config file
    
    Args:
        salt: The salt bytes to save
        config_path: Path to config file
    
    Returns:
        True if successful
    """
    try:
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        config = {}
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
        
        config['salt'] = salt.hex()
        
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error saving salt: {e}")
        return False


def load_salt(config_path: str = '.abstra/config.json') -> bytes:
    """
    Load salt from config file
    
    Args:
        config_path: Path to config file
    
    Returns:
        Salt bytes, or None if not found
    """
    try:
        if not os.path.exists(config_path):
            return None
        
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        if 'salt' in config:
            return bytes.fromhex(config['salt'])
        
        return None
    except Exception as e:
        print(f"Error loading salt: {e}")
        return None


def initialize_encryption(password: str, config_path: str = '.abstra/config.json') -> Tuple[bytes, bytes]:
    """
    Initialize encryption with password and salt
    
    Args:
        password: User password
        config_path: Path to config file
    
    Returns:
        Tuple of (encryption_key, salt)
    """
    salt = load_salt(config_path)
    
    if salt is None:
        salt = generate_salt()
        save_salt(salt, config_path)
    
    key = derive_encryption_key(password, salt)
    
    return key, salt
