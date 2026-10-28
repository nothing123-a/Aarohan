"""
Bank Statement Parser
Extracts structured financial fields and transaction lines from CSV and PDF statements.
Preserves missing/uncertain fields explicitly without inventing values.
"""
from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field
import pymupdf  # PyMuPDF


class ParsedTransaction(BaseModel):
    transaction_date: date
    description: str
    reference_number: Optional[str] = None
    credit_amount: Decimal = Decimal("0.00")
    debit_amount: Decimal = Decimal("0.00")
    running_balance: Optional[Decimal] = None
    transaction_type: str = "debit"
    is_suspicious: bool = False
    flag_reason: Optional[str] = None


class ParsedStatement(BaseModel):
    account_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    statement_period_start: Optional[date] = None
    statement_period_end: Optional[date] = None
    opening_balance: Optional[Decimal] = None
    closing_balance: Optional[Decimal] = None
    total_credits: Decimal = Decimal("0.00")
    total_debits: Decimal = Decimal("0.00")
    transactions: List[ParsedTransaction] = Field(default_factory=list)
    missing_fields: List[str] = Field(default_factory=list)
    confidence_score: float = 100.0
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


def clean_decimal(value_str: Any) -> Optional[Decimal]:
    """Cleans currency strings, removes commas, symbols, Dr/Cr notation."""
    if value_str is None:
        return None
    s = str(value_str).strip()
    if not s or s == "-" or s.lower() == "nil" or s.lower() == "none":
        return None
    # Check for Dr/Cr
    is_negative = False
    if "dr" in s.lower() or s.startswith("-") or (s.startswith("(") and s.endswith(")")):
        is_negative = True
    # Strip non-numeric characters except '.'
    s_clean = re.sub(r"[^\d.]", "", s)
    if not s_clean:
        return None
    try:
        val = Decimal(s_clean)
        return -val if is_negative else val
    except InvalidOperation:
        return None


def parse_date_flexible(date_str: Any) -> Optional[date]:
    """Parses dates across standard Indian banking formats."""
    if not date_str:
        return None
    s = str(date_str).strip()
    # Normalize separators
    s = s.replace("/", "-").replace(".", "-")
    patterns = [
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d-%m-%y",
        "%b-%d-%Y",
    ]
    for fmt in patterns:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# CSV Parser Implementation
# ---------------------------------------------------------------------------

def parse_csv_statement(content: bytes) -> ParsedStatement:
    """
    Parses bank statements in CSV format.
    Handles standard Indian bank exports (SBI, HDFC, ICICI, PNB, BoB, Canara, etc.).
    Extracts metadata from header key-value rows and transaction rows.
    """
    text = content.decode("utf-8", errors="replace")
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    opening_balance: Optional[Decimal] = None
    closing_balance: Optional[Decimal] = None

    table_header_idx = -1
    col_map: Dict[str, int] = {}

    # Scan for metadata in header rows before the transactions table
    for idx, line in enumerate(lines):
        line_lower = line.lower()

        # Check if this row is the transaction table header
        if any(term in line_lower for term in ["txn date", "transaction date", "value date", "date"]) and \
           any(term in line_lower for term in ["narration", "description", "particulars", "remarks"]):
            table_header_idx = idx
            break

        # Check metadata lines (comma-separated or colon-separated)
        parts = [p.strip() for p in line.split(",") if p.strip()]
        for p_idx, part in enumerate(parts):
            p_lower = part.lower()
            if "account holder" in p_lower or "customer name" in p_lower or "name" in p_lower:
                if len(parts) > p_idx + 1:
                    account_holder = parts[p_idx + 1].strip()
            elif "account number" in p_lower or "a/c no" in p_lower or "acc no" in p_lower:
                if len(parts) > p_idx + 1:
                    account_number = parts[p_idx + 1].strip()
            elif "bank" in p_lower:
                if len(parts) > p_idx + 1:
                    bank_name = parts[p_idx + 1].strip()
            elif "opening balance" in p_lower:
                if len(parts) > p_idx + 1:
                    opening_balance = clean_decimal(parts[p_idx + 1])
            elif "closing balance" in p_lower:
                if len(parts) > p_idx + 1:
                    closing_balance = clean_decimal(parts[p_idx + 1])
            elif "from date" in p_lower or "period start" in p_lower or "start date" in p_lower:
                if len(parts) > p_idx + 1:
                    period_start = parse_date_flexible(parts[p_idx + 1])
            elif "to date" in p_lower or "period end" in p_lower or "end date" in p_lower:
                if len(parts) > p_idx + 1:
                    period_end = parse_date_flexible(parts[p_idx + 1])

    # If no explicit table header was found, assume header is line 0
    if table_header_idx == -1:
        table_header_idx = 0

    # Parse column mapping from the header row
    header_row = [c.strip().lower() for c in next(csv.reader([lines[table_header_idx]])) if c.strip()]
    for col_idx, col in enumerate(header_row):
        if any(t in col for t in ["txn date", "transaction date", "value date", "date"]):
            if "date" not in col_map:
                col_map["date"] = col_idx
        elif any(t in col for t in ["narration", "description", "particulars", "details"]):
            col_map["description"] = col_idx
        elif any(t in col for t in ["chq", "cheque", "ref", "reference", "utr"]):
            col_map["ref"] = col_idx
        elif any(t in col for t in ["debit", "withdrawal", "dr"]):
            col_map["debit"] = col_idx
        elif any(t in col for t in ["credit", "deposit", "cr"]):
            col_map["credit"] = col_idx
        elif any(t in col for t in ["balance", "closing"]):
            col_map["balance"] = col_idx

    transactions: List[ParsedTransaction] = []
    total_credits = Decimal("0.00")
    total_debits = Decimal("0.00")

    # Read transaction rows
    csv_reader = csv.reader(lines[table_header_idx + 1:])
    for row in csv_reader:
        if not row or not any(row):
            continue
        
        # Check if line contains summary info rather than transaction
        row_str = " ".join(row).lower()
        if "opening balance" in row_str:
            for cell in row:
                d = clean_decimal(cell)
                if d is not None:
                    opening_balance = d
            continue
        if "closing balance" in row_str:
            for cell in row:
                d = clean_decimal(cell)
                if d is not None:
                    closing_balance = d
            continue
        if "total" in row_str and not any(row[col_map.get("date", 0)].strip() for _ in [0]):
            continue

        # Extract date
        date_idx = col_map.get("date", 0)
        if date_idx >= len(row):
            continue
        t_date = parse_date_flexible(row[date_idx])
        if not t_date:
            continue  # Not a transaction row

        # Description
        desc_idx = col_map.get("description", 1)
        desc = row[desc_idx].strip() if desc_idx < len(row) else "Transaction"

        # Reference
        ref_idx = col_map.get("ref")
        ref_val = row[ref_idx].strip() if ref_idx is not None and ref_idx < len(row) else None

        # Debit & Credit
        debit_idx = col_map.get("debit")
        credit_idx = col_map.get("credit")
        debit_val = clean_decimal(row[debit_idx]) if debit_idx is not None and debit_idx < len(row) else Decimal("0.00")
        credit_val = clean_decimal(row[credit_idx]) if credit_idx is not None and credit_idx < len(row) else Decimal("0.00")

        debit_amt = debit_val if debit_val and debit_val > 0 else Decimal("0.00")
        credit_amt = credit_val if credit_val and credit_val > 0 else Decimal("0.00")

        # Balance
        bal_idx = col_map.get("balance")
        bal_val = clean_decimal(row[bal_idx]) if bal_idx is not None and bal_idx < len(row) else None

        # Classify transaction type
        t_type = "credit" if credit_amt > 0 else "debit"
        if "interest" in desc.lower():
            t_type = "interest"
        elif "fee" in desc.lower() or "charge" in desc.lower():
            t_type = "fee"
        elif "reverse" in desc.lower() or "reversal" in desc.lower():
            t_type = "reversal"

        # Flag unusually large debits (> ₹500,000) for review
        is_suspicious = False
        flag_reason = None
        if debit_amt >= Decimal("500000.00"):
            is_suspicious = True
            flag_reason = f"High-value debit of ₹{float(debit_amt):,.2f} requires verification."

        transactions.append(ParsedTransaction(
            transaction_date=t_date,
            description=desc,
            reference_number=ref_val,
            credit_amount=credit_amt,
            debit_amount=debit_amt,
            running_balance=bal_val,
            transaction_type=t_type,
            is_suspicious=is_suspicious,
            flag_reason=flag_reason,
        ))

        total_credits += credit_amt
        total_debits += debit_amt

    # If period dates were not explicit in header, derive from transaction dates
    if transactions:
        tx_dates = [t.transaction_date for t in transactions]
        if not period_start:
            period_start = min(tx_dates)
        if not period_end:
            period_end = max(tx_dates)

    # Derive opening / closing balance from running balance if missing
    if transactions:
        if opening_balance is None:
            first_tx = transactions[0]
            if first_tx.running_balance is not None:
                # opening = running_balance - credit + debit
                opening_balance = first_tx.running_balance - first_tx.credit_amount + first_tx.debit_amount
        if closing_balance is None:
            last_tx = transactions[-1]
            if last_tx.running_balance is not None:
                closing_balance = last_tx.running_balance

    # Identify missing fields explicitly
    missing: List[str] = []
    if not account_holder:
        missing.append("account_holder_name")
    if not account_number:
        missing.append("account_number")
    if not bank_name:
        missing.append("bank_name")
    if opening_balance is None:
        missing.append("opening_balance")
    if closing_balance is None:
        missing.append("closing_balance")
    if not period_start:
        missing.append("statement_period_start")
    if not period_end:
        missing.append("statement_period_end")

    # Calculate confidence score
    confidence = 100.0 - (len(missing) * 12.0)
    confidence = max(20.0, min(100.0, confidence))

    return ParsedStatement(
        account_holder_name=account_holder,
        bank_name=bank_name,
        account_number=account_number,
        statement_period_start=period_start,
        statement_period_end=period_end,
        opening_balance=opening_balance,
        closing_balance=closing_balance,
        total_credits=total_credits,
        total_debits=total_debits,
        transactions=transactions,
        missing_fields=missing,
        confidence_score=confidence,
        raw_metadata={"format": "csv", "row_count": len(transactions)},
    )


# ---------------------------------------------------------------------------
# PDF Parser Implementation
# ---------------------------------------------------------------------------

def parse_pdf_statement(content: bytes) -> ParsedStatement:
    """
    Parses bank statements in PDF format using PyMuPDF (fitz).
    Extracts text blocks, regex metadata, and tabular transaction lines.
    """
    doc = pymupdf.open(stream=content, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"

    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    opening_balance: Optional[Decimal] = None
    closing_balance: Optional[Decimal] = None

    # Search for Bank Name
    for b in ["State Bank of India", "SBI", "HDFC Bank", "ICICI Bank", "Punjab National Bank", "PNB", "Bank of Baroda", "Canara Bank", "Union Bank of India"]:
        if b.lower() in full_text.lower():
            bank_name = b
            break

    # Account Number regex
    acc_match = re.search(r"(?:A/C|Account|Acc|A/c)\s*(?:No|Number|#)?[:.\s-]*([A-Za-z0-9-]{8,20})", full_text, re.IGNORECASE)
    if acc_match:
        account_number = acc_match.group(1).strip()

    # Account Holder
    holder_match = re.search(r"(?:Name|Account Holder|Customer Name)[:.\s-]*([A-Za-z\s.,&]{4,50})", full_text, re.IGNORECASE)
    if holder_match:
        candidate = holder_match.group(1).strip()
        # Avoid picking up header labels
        if not any(k in candidate.lower() for k in ["address", "date", "statement", "branch", "ifsc"]):
            account_holder = candidate

    # Period dates
    period_match = re.search(
        r"(?:Period|From)[:.\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:to|-|through)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        full_text,
        re.IGNORECASE,
    )
    if period_match:
        period_start = parse_date_flexible(period_match.group(1))
        period_end = parse_date_flexible(period_match.group(2))

    # Opening balance
    open_match = re.search(r"(?:Opening Balance|B/F|Brought Forward)[:.\s-]*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)", full_text, re.IGNORECASE)
    if open_match:
        opening_balance = clean_decimal(open_match.group(1))

    # Closing balance
    close_match = re.search(r"(?:Closing Balance|C/F|Carried Forward)[:.\s-]*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)", full_text, re.IGNORECASE)
    if close_match:
        closing_balance = clean_decimal(close_match.group(1))

    # Parse transaction lines using regex: Date ... Description ... Amount ... Balance
    transactions: List[ParsedTransaction] = []
    total_credits = Decimal("0.00")
    total_debits = Decimal("0.00")

    # Match lines starting with a date e.g. "15/01/2026 Salary Credit 50,000.00 1,50,000.00"
    line_pattern = re.compile(
        r"^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([0-9,]+\.[0-9]{2})(?:\s+([0-9,]+\.[0-9]{2}))?$",
        re.MULTILINE,
    )

    for match in line_pattern.finditer(full_text):
        t_date = parse_date_flexible(match.group(1))
        if not t_date:
            continue
        desc = match.group(2).strip()
        amt1 = clean_decimal(match.group(3)) or Decimal("0.00")
        amt2 = clean_decimal(match.group(4)) if match.group(4) else None

        # Determine credit vs debit
        is_credit = any(c in desc.lower() for c in ["credit", "deposit", "cr", "interest", "salary", "neft in", "rtgs in"])
        if is_credit:
            credit_amt = amt1
            debit_amt = Decimal("0.00")
            running_bal = amt2
        else:
            debit_amt = amt1
            credit_amt = Decimal("0.00")
            running_bal = amt2

        transactions.append(ParsedTransaction(
            transaction_date=t_date,
            description=desc,
            credit_amount=credit_amt,
            debit_amount=debit_amt,
            running_balance=running_bal,
            transaction_type="credit" if is_credit else "debit",
            is_suspicious=debit_amt >= Decimal("500000.00"),
            flag_reason=f"High-value debit ₹{float(debit_amt):,.2f}" if debit_amt >= Decimal("500000.00") else None,
        ))
        total_credits += credit_amt
        total_debits += debit_amt

    # Derive missing period if transactions found
    if transactions:
        tx_dates = [t.transaction_date for t in transactions]
        if not period_start:
            period_start = min(tx_dates)
        if not period_end:
            period_end = max(tx_dates)

    missing: List[str] = []
    if not account_holder:
        missing.append("account_holder_name")
    if not account_number:
        missing.append("account_number")
    if not bank_name:
        missing.append("bank_name")
    if opening_balance is None:
        missing.append("opening_balance")
    if closing_balance is None:
        missing.append("closing_balance")
    if not period_start:
        missing.append("statement_period_start")
    if not period_end:
        missing.append("statement_period_end")

    confidence = 100.0 - (len(missing) * 14.0)
    confidence = max(20.0, min(100.0, confidence))

    return ParsedStatement(
        account_holder_name=account_holder,
        bank_name=bank_name,
        account_number=account_number,
        statement_period_start=period_start,
        statement_period_end=period_end,
        opening_balance=opening_balance,
        closing_balance=closing_balance,
        total_credits=total_credits,
        total_debits=total_debits,
        transactions=transactions,
        missing_fields=missing,
        confidence_score=confidence,
        raw_metadata={"format": "pdf", "page_count": len(doc)},
    )


def parse_statement(content: bytes, filename: str, mime_type: str) -> ParsedStatement:
    """Dispatches to CSV or PDF parser according to file type."""
    fn_lower = filename.lower()
    if mime_type == "text/csv" or fn_lower.endswith(".csv"):
        return parse_csv_statement(content)
    elif mime_type == "application/pdf" or fn_lower.endswith(".pdf"):
        return parse_pdf_statement(content)
    else:
        raise ValueError(f"Unsupported file format '{mime_type}'. Only CSV and PDF bank statements are supported.")

