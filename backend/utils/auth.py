"""Authentication utilities for password management"""

import bcrypt
from typing import Tuple


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with 12 rounds
    
    Args:
        password: Plain text password
    
    Returns:
        Hashed password as string
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against a bcrypt hash
    
    Args:
        password: Plain text password to verify
        hashed: Stored bcrypt hash
    
    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def change_password(old_password: str, new_password: str, stored_hash: str) -> Tuple[bool, str]:
    """
    Change password with verification
    
    Args:
        old_password: Current password
        new_password: New password to set
        stored_hash: Currently stored password hash
    
    Returns:
        Tuple of (success: bool, new_hash: str or error_message: str)
    """
    if not verify_password(old_password, stored_hash):
        return False, "Current password is incorrect"
    
    if len(new_password) < 8:
        return False, "New password must be at least 8 characters"
    
    new_hash = hash_password(new_password)
    return True, new_hash
