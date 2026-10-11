"""Read the supplied Excel without modifying it; prepare private, transactional SQL.

Requires openpyxl (available in the Codex bundled Python runtime).
Usage: python scripts/prepare-procurement-catalog.py SOURCE.xlsx
No database/network access. Review the audit and SQL before executing in staging.
"""
import argparse
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import uuid
import posixpath
import zipfile
import xml.etree.ElementTree as ET

import openpyxl

MASTER = "ฐานข้อมูลพัสดุMaster Data"
HEADERS = ["ลำดับ", "รหัสพัสดุ", "หมวดหลัก", "หมวดย่อย", "รายการพัสดุ (ชื่อสินค้า)",
           "คุณลักษณะเฉพาะ (Specification)", "หน่วยนับ", "ราคากลาง(บาท)",
           "แหล่งอ้างอิงราคา", "หมายเหตุ", "รูปภาพประกอบ"]


def embedded_images(source):
    """Map drawing anchors to Master K rows without extracting/publishing images."""
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
          'x': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
          'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
    found = {}
    with zipfile.ZipFile(source) as archive:
        def links(part):
            rel = posixpath.join(posixpath.dirname(part), '_rels', posixpath.basename(part)+'.rels')
            if rel not in archive.namelist():
                return {}
            result = {}
            for node in ET.fromstring(archive.read(rel)):
                if node.get('TargetMode') == 'External':
                    continue
                target = node.get('Target', '')
                member = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(part), target))
                if member.startswith('../') or member not in archive.namelist():
                    raise ValueError('Invalid internal workbook relationship')
                result[node.get('Id')] = member
            return result
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        sheet = next(s for s in workbook.findall('s:sheets/s:sheet', ns) if s.get('name') == MASTER)
        sheet_part = links('xl/workbook.xml')[sheet.get('{'+ns['r']+'}id')]
        sheet_links = links(sheet_part)
        for drawing in ET.fromstring(archive.read(sheet_part)).findall('s:drawing', ns):
            drawing_part = sheet_links[drawing.get('{'+ns['r']+'}id')]
            image_links = links(drawing_part)
            for anchor in ET.fromstring(archive.read(drawing_part)):
                blips = anchor.findall('.//a:blip', ns)
                if not blips:
                    continue
                row = anchor.findtext('x:from/x:row', namespaces=ns)
                col = anchor.findtext('x:from/x:col', namespaces=ns)
                if row is None or col != '10' or len(blips) != 1:
                    raise ValueError('Image anchor needs manual review; expected one image in Master K')
                member = image_links.get(blips[0].get('{'+ns['r']+'}embed'))
                row_number = int(row)+1
                if not member or row_number in found:
                    raise ValueError('Missing/duplicate embedded image')
                found[row_number] = dict(archive_member=member, sha256=hashlib.sha256(archive.read(member)).hexdigest())
    return found


def text(value):
    return "" if value is None else str(value).strip()


def number(value, maximum, positive=False):
    try:
        n = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError(f"Invalid number: {value}") from exc
    if not n.is_finite() or n < 0 or (positive and n == 0) or n > maximum or n != n.quantize(Decimal('0.01')):
        raise ValueError(f"Number out of range/precision: {value}")
    return str(n)


def parse_date(value, fiscal_year):
    match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(25\d{2})", text(value))
    if not match:
        raise ValueError(f"Expected Thai d/m/yyyy date: {value}")
    day, month, year = map(int, match.groups())
    parsed = date(year - 543, month, day)
    if year + (1 if month >= 10 else 0) != fiscal_year:
        raise ValueError(f"Date outside fiscal year {fiscal_year}: {value}")
    return parsed.isoformat()


def read_source(source):
    images = embedded_images(source)
    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    book = openpyxl.load_workbook(source, read_only=True, data_only=False)
    try:
        if MASTER not in book.sheetnames:
            raise ValueError("Missing Master Data worksheet")
        sheets = {}
        for sheet in book:
            rows = []
            for row_num, values in enumerate(sheet.values, 1):
                cells = list(values)
                while cells and cells[-1] is None:
                    cells.pop()
                if cells:
                    if any(isinstance(v, str) and ('$check$' in v or '\x00' in v) for v in cells):
                        raise ValueError(f"Unsupported SQL delimiter/control character: {sheet.title}:{row_num}")
                    if any(isinstance(v, str) and v.startswith('=') for v in cells):
                        raise ValueError(f"Formula requires manual review: {sheet.title}:{row_num}")
                    rows.append((row_num, cells))
            sheets[sheet.title] = rows
        if sheets[MASTER][0][1] != HEADERS:
            raise ValueError("Master headers changed; review mapping before importing")
        categories = {}
        for _, cells in sheets[MASTER]:
            if len(cells) > 1 and isinstance(cells[1], str):
                match = re.fullmatch(r"\d+\.(.+?)\s+รหัสพัสดุ คือ\s+([A-Z]+)", cells[1].strip())
                if match:
                    name, code = match.groups()
                    if name in categories or code in categories.values():
                        raise ValueError("Duplicate category note")
                    categories[name] = code
        if not categories:
            raise ValueError("No category definitions in source notes")
        items, history, raw, notes = [], [], [], []
        seen_codes = set()
        for sheet_name, rows in sheets.items():
            category = None
            is_master = sheet_name == MASTER
            if not is_master and not re.fullmatch(r"ปีงบ \d{2}", sheet_name):
                raise ValueError(f"Unexpected worksheet: {sheet_name}")
            year = None if is_master else 2500 + int(sheet_name[-2:])
            if not is_master and rows[1][1] != ["ประเภท", "รายการวัสดุ", "วันที่จัดซื้อ", "จำนวน"]:
                raise ValueError(f"History headers changed: {sheet_name}")
            seen_history = set()
            for row_num, cells in rows:
                values = cells + [None] * max(0, 11-len(cells))
                numeric_row = isinstance(values[0], (int, float)) and not isinstance(values[0], bool)
                kind = 'item' if is_master and numeric_row else 'history' if numeric_row else 'header' if row_num <= 2 else 'note'
                raw.append(dict(sheet=sheet_name, row=row_num, kind=kind, cells=cells))
                if not numeric_row:
                    if not is_master and row_num > 2:
                        if text(values[0]) not in categories or any(v is not None for v in values[1:]):
                            raise ValueError(f"Unknown history section: {sheet_name}:{row_num}")
                        category = categories[text(values[0])]
                    elif is_master and row_num > 1 and any(v is not None for v in values[2:]):
                        raise ValueError(f"Unclassified master row: {row_num}")
                    continue
                if is_master:
                    code = text(values[1])
                    if not re.fullmatch(r"[A-Z]+-\d{3}-\d{2}", code) or code in seen_codes:
                        raise ValueError(f"Invalid/duplicate master code: {code}")
                    seen_codes.add(code)
                    category_code = categories.get(text(values[2]))
                    if not category_code or not code.startswith(category_code+'-'):
                        raise ValueError(f"Category/code mismatch: {code}")
                    if any(not text(values[c]) for c in (3, 4, 5, 6, 8)):
                        raise ValueError(f"Incomplete master row: {row_num}")
                    item = dict(code=code, category=category_code, subcategory=text(values[3]), name=text(values[4]),
                                specification=text(values[5]), unit=text(values[6]), price=number(values[7], Decimal('999999999999.99')),
                                source=text(values[8]), notes=text(values[9]), image=text(values[10]) or None,
                                sheet=sheet_name, row=row_num)
                    if len(item['name']+' — '+item['specification']) > 500:
                        raise ValueError(f"Description exceeds request limit: {code}")
                    items.append(item)
                    if row_num in images:
                        if item['image']:
                            raise ValueError('Cell image reference and embedded image both present; review mapping')
                        item['image'] = 'xlsx:'+source_sha+'#'+images[row_num]['archive_member']
                else:
                    if category is None or len(cells) != 4:
                        raise ValueError(f"Incomplete history: {sheet_name}:{row_num}")
                    match = re.fullmatch(r"([0-9][0-9.\-]*)\s+(.+)", text(values[1]))
                    quantity = re.fullmatch(r"(\d+(?:\.\d+)?)\s+(.+)", text(values[3]))
                    if not match or not quantity:
                        raise ValueError(f"Invalid code/quantity: {sheet_name}:{row_num}")
                    key = tuple(values[1:4])
                    if key in seen_history:
                        notes.append(f"Possible duplicate purchase retained: {sheet_name}:{row_num}")
                    seen_history.add(key)
                    history.append(dict(sheet=sheet_name, row=row_num, year=year, category=category,
                                        code=match[1], description=match[2], date=parse_date(values[2], year),
                                        quantity=number(quantity[1], Decimal('9999999999.99'), True), unit=quantity[2]))
        if not items:
            raise ValueError("No catalog items")
        if set(images) - {i['row'] for i in items}:
            raise ValueError('Embedded image not attached to a catalog item')
        return dict(items=items, history=history, raw=raw, categories=categories, notes=notes, images=images)
    finally:
        book.close()


def literal(value):
    if value is None:
        return 'null'
    # Standard-conforming SQL strings; do not interpolate SQL identifiers from Excel.
    return "'" + str(value).replace("'", "''") + "'"


def prepare(source, output):
    data = read_source(source)
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    import_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'pol-ubu-catalog:' + sha))
    summary = dict(items=len(data['items']), history=len(data['history']), raw_rows=len(data['raw']),
                   history_by_sheet=dict(Counter(x['sheet'] for x in data['history'])),
                   unverified_prices=len(data['items']), missing_reference_dates=len(data['items']),
                   embedded_images=data['images'], notes=data['notes'])
    sql = ["-- PRIVATE generated import. Review and run AFTER catalog migration, first in staging.",
           "begin;", "set local standard_conforming_strings = on;",
           "select pg_advisory_xact_lock(hashtext('pol-ubu-catalog-import'));",
           "insert into public.catalog_imports(id,file_name,file_sha256,summary) values (" +
           ','.join(map(literal, [import_id, source.name, sha, json.dumps(summary, ensure_ascii=False)])) + ') on conflict (file_sha256) do nothing;']
    # A repeated file resolves the existing id even if first imported by another tool.
    iid = f"(select id from public.catalog_imports where file_sha256={literal(sha)})"
    for name, code in data['categories'].items():
        sql.append(f"insert into public.catalog_categories(code,name) values ({literal(code)},{literal(name)}) on conflict (code) do nothing;")
        sql.append(f"do $check$ begin if exists(select 1 from public.catalog_categories where code={literal(code)} and name is distinct from {literal(name)}) then raise exception 'Category changed; review mapping'; end if; end $check$;")
    for row in data['raw']:
        values = [iid, literal(row['sheet']), str(row['row']), literal(row['kind']), literal(json.dumps(row['cells'], ensure_ascii=False))]
        sql.append('insert into public.catalog_source_rows(import_id,sheet_name,row_number,row_kind,raw_cells) values ('+','.join(values)+') on conflict (import_id,sheet_name,row_number) do nothing;')
    for item in data['items']:
        fields = ['item_code','category_code','subcategory','name','specification','unit','notes','image_reference']
        values = [item[k] for k in ['code','category','subcategory','name','specification','unit','notes','image']]
        sql.append('insert into public.catalog_items('+','.join(fields)+') values ('+','.join(map(literal,values))+') on conflict (item_code) do nothing;')
        checks = ' or '.join(f'{field} is distinct from {literal(value)}' for field,value in zip(fields[1:],values[1:]))
        # Tagged blocks must never contain source-controlled dollar tags.
        if any('$check$' in str(value) for value in values):
            raise ValueError('Reserved SQL delimiter in item data')
        sql.append(f"do $check$ begin if exists(select 1 from public.catalog_items where item_code={literal(item['code'])} and ({checks})) then raise exception 'Existing item metadata changed; review before import'; end if; end $check$;")
        sql.append('insert into public.catalog_prices(item_id,import_id,sheet_name,row_number,reference_price,source_name) values ('+
                   f"(select id from public.catalog_items where item_code={literal(item['code'])}),{iid},{literal(item['sheet'])},{item['row']},{item['price']},{literal(item['source'])}) on conflict (import_id,sheet_name,row_number) do nothing;")
    for row in data['history']:
        values = [iid, literal(row['sheet']), str(row['row']), str(row['year']), literal(row['category']), literal(row['code']),
                  literal(row['description']), literal(row['date']), row['quantity'], literal(row['unit'])]
        sql.append('insert into public.catalog_purchase_history(import_id,sheet_name,row_number,fiscal_year,category_code,fmis_item_code,description,purchased_on,quantity,unit) values ('+','.join(values)+') on conflict (import_id,sheet_name,row_number) do nothing;')
    sql += [f"select 'prices' as records, count(*) from public.catalog_prices where import_id={iid}",
            f"union all select 'history', count(*) from public.catalog_purchase_history where import_id={iid};", "commit;"]
    output.mkdir(parents=True, exist_ok=True)
    (output/'import.sql').write_text('\n'.join(sql)+'\n',encoding='utf-8')
    audit = dict(source_file=source.name, sha256=sha, **summary)
    (output/'audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    return audit


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path('supabase/private/catalog'))
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.output), ensure_ascii=False, indent=2))
