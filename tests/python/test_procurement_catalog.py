"""Pure parser/validation tests; does not create or edit Excel workbooks."""
import importlib.util
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('catalog_import', Path(__file__).parents[2]/'scripts/prepare-procurement-catalog.py')
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class CatalogImportTests(unittest.TestCase):
    def test_thai_date_and_fiscal_boundaries(self):
        self.assertEqual(catalog.parse_date('1/10/2567', 2568), '2024-10-01')
        self.assertEqual(catalog.parse_date('30/09/2568', 2568), '2025-09-30')
        self.assertEqual(catalog.parse_date('29/02/2567', 2567), '2024-02-29')
        for value in ['31/02/2567', '1/10/2568', '2024-10-01', '29/02/2566']:
            with self.assertRaises(ValueError):
                catalog.parse_date(value, 2568)

    def test_amounts_do_not_turn_missing_into_zero_or_round_silently(self):
        for value in [None, '', '-1', 'NaN', 'Infinity', '1.001', '1000000000000']:
            with self.assertRaises(ValueError):
                catalog.number(value, Decimal('999999999999.99'))
        self.assertEqual(catalog.number(0, Decimal('999')), '0')
        with self.assertRaises(ValueError):
            catalog.number(0, Decimal('999'), True)

    def test_sql_literal_escaping(self):
        self.assertEqual(catalog.literal(None), 'null')
        self.assertEqual(catalog.literal("O'Brien"), "'O''Brien'")
        self.assertEqual(catalog.literal("'; drop table x; --"), "'''; drop table x; --'")

    def parse(self, item_changes=None, history_date='01/10/2567', history_quantity='2 อัน', extra_item=False):
        row = [1, 'OFF-001-01', 'วัสดุสำนักงาน', 'กลุ่มทดสอบ', 'สินค้าทดสอบ', ' สเปกทดสอบ ', 'อัน', 52, 'แหล่งทดสอบ', None]
        for index, value in (item_changes or {}).items():
            row[index] = value
        class Book:
            sheetnames = [catalog.MASTER, 'ปีงบ 68']
            def __iter__(self):
                master = [catalog.HEADERS, row]
                if extra_item:
                    master.append(row.copy())
                master += [[None, '1.วัสดุสำนักงาน รหัสพัสดุ คือ OFF']]
                return iter([
                    SimpleNamespace(title=catalog.MASTER, values=master),
                    SimpleNamespace(title='ปีงบ 68', values=[['หัวเรื่อง'], ['ประเภท', 'รายการวัสดุ', 'วันที่จัดซื้อ', 'จำนวน'], ['วัสดุสำนักงาน'], [1, '001.1-2 สินค้าทดสอบ', history_date, history_quantity]]),
                ])
            def close(self):
                pass
        with patch.object(catalog, 'embedded_images', return_value={}), patch.object(catalog.openpyxl, 'load_workbook', return_value=Book()):
            return catalog.read_source(SimpleNamespace(read_bytes=lambda: b'test'))

    def test_preserves_raw_spec_and_fmis_code_separately(self):
        data = self.parse()
        self.assertEqual(data['items'][0]['specification'], 'สเปกทดสอบ')
        self.assertEqual(data['raw'][1]['cells'][5], ' สเปกทดสอบ ')
        self.assertEqual(data['history'][0]['code'], '001.1-2')
        self.assertEqual(data['history'][0]['quantity'], '2')
        self.assertNotIn('price', data['history'][0])
        self.assertEqual(len(data['items']), 1)

    def test_rejects_duplicates_formulas_missing_values_and_reserved_delimiters(self):
        with self.assertRaises(ValueError):
            self.parse(extra_item=True)
        for changes in [{7: '=10+2'}, {7: None}, {1: 'BAD'}, {2: 'unknown'}, {6: None}, {4: '$check$'}, {8: 'bad\x00text'}, {5: 'x'*501}]:
            with self.assertRaises(ValueError):
                self.parse(item_changes=changes)

    def test_rejects_ambiguous_history_date_and_unit(self):
        with self.assertRaises(ValueError):
            self.parse(history_quantity='2')
        with self.assertRaises(ValueError):
            self.parse(history_date='11/10/2568')


if __name__ == '__main__':
    unittest.main()
