# Bank Analyzer Backend

## Structure

```
backend/
├── main.py              # Main API entry point
├── database/
│   └── manager.py       # Database operations
├── parsers/
│   ├── csv_parser.py    # CSV file parsing
│   └── pdf_parser.py    # PDF file parsing
├── ml/
│   └── categorizer.py   # Transaction categorization
├── utils/
│   └── helpers.py       # Utility functions
└── tests/               # Test files
```

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Test the backend:
```bash
python test_backend.py
```

## Usage

```python
from main import BankAnalyzerAPI

api = BankAnalyzerAPI()
result = api.parse_csv("transactions.csv")
print(f"Parsed {result['count']} transactions")
```

## API Methods

- `parse_csv(file_path)` - Parse CSV file
- `parse_pdf(file_path)` - Parse PDF statement
- `get_transactions(filters)` - Retrieve transactions
- `get_spending_summary(start_date, end_date)` - Get spending analytics

## Testing

Run the test script to verify everything works:
```bash
python test_backend.py
```
