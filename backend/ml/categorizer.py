"""Machine learning transaction categorizer"""

from typing import Tuple, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class MLCategorizer:
    def __init__(self):
        # Rule-based categorization for common merchants
        self.rules = {
            # AI/Tech Services
            'anthropic': 'AI Services',
            'openai': 'AI Services',
            'chatgpt': 'AI Services',
            'claude': 'AI Services',
            
            # Cloud/Web Services
            'aws': 'Cloud Services',
            'amazon web services': 'Cloud Services',
            'netlify': 'Cloud Services',
            'railway': 'Cloud Services',
            'pinecone': 'Cloud Services',
            'wix': 'Web Services',
            'squarespace': 'Web Services',
            
            # Entertainment
            'steam': 'Entertainment',
            'netflix': 'Entertainment',
            'spotify': 'Entertainment',
            
            # Health & Fitness
            'fitness': 'Health & Fitness',
            'gym': 'Health & Fitness',
            'republic fitness': 'Health & Fitness',
            
            # Services
            'insurance': 'Insurance',
            'laundry': 'Services',
            'rinse': 'Services',
            'corporate filings': 'Business Services',
            
            # Transportation
            'parking': 'Transportation',
            'uber': 'Transportation',
            'lyft': 'Transportation'
        }
    
    def categorize(self, transaction: Dict[str, Any]) -> Tuple[str, float]:
        """
        Categorize a transaction.
        
        DUMMY IMPLEMENTATION: Always returns 'Uncategorized' with 0.0 confidence.
        This is a placeholder for the future ML model.
        
        Returns: (category, confidence)
        """
        return ('Uncategorized', 0.0)
    
    def train(self, transactions: List[Dict[str, Any]]):
        """Train the model with user-corrected transactions"""
        # Placeholder for future ML implementation
        logger.info(f"Training with {len(transactions)} transactions")
        pass
