"""
Application configuration and constants
"""

from pathlib import Path

class AppSettings:
    """Application settings and configuration"""
    APP_NAME = "Financial Management & Simulation Tool"
    APP_VERSION = "2.0.0"
    APP_AUTHOR = "Financial Management Team"
    
    # File Paths
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    BACKUP_DIR = DATA_DIR / "backups"
    EXPORT_DIR = DATA_DIR / "exports"
    LOG_DIR = DATA_DIR / "logs"
    APP_DATA_FILE = DATA_DIR / "app_data.json"
    
    # GUI Settings
    WINDOW_WIDTH = 1400
    WINDOW_HEIGHT = 900
    MIN_WINDOW_WIDTH = 1000
    MIN_WINDOW_HEIGHT = 700
    
    # Default Settings
    DEFAULT_ALERT_THRESHOLD = 10
    DEFAULT_CURRENCY = "₹"
    AUTO_SAVE_INTERVAL = 30
    BACKUP_RETENTION_DAYS = 30
    
    @classmethod
    def ensure_directories(cls):
        """Ensure all required directories exist"""
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.BACKUP_DIR.mkdir(exist_ok=True)
        cls.EXPORT_DIR.mkdir(exist_ok=True)
        cls.LOG_DIR.mkdir(exist_ok=True)

# Categories Configuration
DEFAULT_CATEGORIES = {
    "Loans & EMIs": [
        "Credit Card EMI 1", "Credit Card EMI 2", 
        "Personal Loan EMI 1", "Personal Loan EMI 2", "Home Loan EMI"
    ],
    "Investments": [
        "Mutual Fund SIP", "PPF", "RD", "Ponmagan Policy",
        "Gold Investment", "Bitcoin Investment", 
        "Baby Health Policy", "Baby Education Policy"
    ],
    "Lifestyle & Essentials": [
        "OTT Subscriptions", "Hospital", "Swiggy/Food",
        "Petrol", "General Expenses", "Shopping"
    ],
    "Custom": []
}

# Auto-categorization keywords
CATEGORY_KEYWORDS = {
    "Credit Card EMI 1": ["CC1", "CREDIT CARD", "EMI", "HDFC CC"],
    "Credit Card EMI 2": ["CC2", "ICICI CC", "AXIS CC"],
    "Personal Loan EMI 1": ["PERSONAL LOAN", "PL EMI", "LOAN EMI"],
    "Personal Loan EMI 2": ["PL2", "PERSONAL LOAN 2"],
    "Home Loan EMI": ["HOME LOAN", "HOUSING LOAN", "HL EMI"],
    "Mutual Fund SIP": ["MF", "SIP", "MUTUAL FUND", "HDFC MF", "ICICI MF"],
    "PPF": ["PPF", "PROVIDENT FUND", "PUBLIC PROVIDENT"],
    "RD": ["RD", "RECURRING DEPOSIT"],
    "Ponmagan Policy": ["PONMAGAN", "LIC PONMAGAN"],
    "Gold Investment": ["GOLD", "BULLION", "GOLD ETF"],
    "Bitcoin Investment": ["BITCOIN", "BTC", "CRYPTO", "CRYPTOCURRENCY"],
    "Baby Health Policy": ["BABY HEALTH", "CHILD HEALTH", "HEALTH POLICY"],
    "Baby Education Policy": ["BABY EDUCATION", "CHILD EDUCATION", "EDUCATION POLICY"],
    "OTT Subscriptions": ["NETFLIX", "PRIME", "HOTSTAR", "OTT", "SUBSCRIPTION"],
    "Hospital": ["HOSPITAL", "CLINIC", "MEDICAL", "DOCTOR", "APOLLO", "FORTIS"],
    "Swiggy/Food": ["SWIGGY", "ZOMATO", "FOOD", "DELIVERY", "RESTAURANT"],
    "Petrol": ["PETROL", "FUEL", "DIESEL", "PETROL PUMP", "HP", "IOCL"],
    "General Expenses": ["MISC", "GENERAL", "OTHER", "EXPENSE"],
    "Shopping": ["SHOPPING", "AMAZON", "FLIPKART", "MALL", "STORE", "RETAIL"]
}

# Generate planning months (Aug 2025 to Jul 2027)
def generate_planning_months():
    """Generate list of planning months"""
    months = []
    start_year = 2025
    start_month = 8  # August
    month_names = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"]
    
    for i in range(24):  # 24 months
        year = start_year + (start_month + i - 1) // 12
        month = (start_month + i - 1) % 12 + 1
        month_name = month_names[month - 1]
        months.append(f"{month_name[:3]}-{str(year)[2:]}")
    
    return months

PLANNING_MONTHS = generate_planning_months()
CURRENCY_SYMBOL = "₹"
MIN_AMOUNT = 0
MAX_AMOUNT = 10000000

# Budget templates
BUDGET_TEMPLATES = {
    "Conservative": {
        "Credit Card EMI 1": 15000, "Credit Card EMI 2": 12000,
        "Personal Loan EMI 1": 8000, "Personal Loan EMI 2": 6000, "Home Loan EMI": 25000,
        "Mutual Fund SIP": 5000, "PPF": 2000, "RD": 3000, "Ponmagan Policy": 1500,
        "Gold Investment": 2000, "Bitcoin Investment": 1000,
        "Baby Health Policy": 800, "Baby Education Policy": 1200,
        "OTT Subscriptions": 500, "Hospital": 8000, "Swiggy/Food": 3000,
        "Petrol": 3000, "General Expenses": 5000, "Shopping": 5000
    },
    "Moderate": {
        "Credit Card EMI 1": 15000, "Credit Card EMI 2": 12000,
        "Personal Loan EMI 1": 8000, "Personal Loan EMI 2": 6000, "Home Loan EMI": 25000,
        "Mutual Fund SIP": 7000, "PPF": 2000, "RD": 3000, "Ponmagan Policy": 1500,
        "Gold Investment": 3000, "Bitcoin Investment": 2000,
        "Baby Health Policy": 800, "Baby Education Policy": 1200,
        "OTT Subscriptions": 800, "Hospital": 10000, "Swiggy/Food": 5000,
        "Petrol": 4000, "General Expenses": 8000, "Shopping": 8000
    },
    "Aggressive": {
        "Credit Card EMI 1": 15000, "Credit Card EMI 2": 12000,
        "Personal Loan EMI 1": 8000, "Personal Loan EMI 2": 6000, "Home Loan EMI": 25000,
        "Mutual Fund SIP": 10000, "PPF": 2000, "RD": 5000, "Ponmagan Policy": 1500,
        "Gold Investment": 5000, "Bitcoin Investment": 3000,
        "Baby Health Policy": 1000, "Baby Education Policy": 1500,
        "OTT Subscriptions": 1000, "Hospital": 12000, "Swiggy/Food": 8000,
        "Petrol": 5000, "General Expenses": 10000, "Shopping": 12000
    }
}
