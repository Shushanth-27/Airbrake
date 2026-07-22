import hashlib
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / 'ai' / 'error_matching.py'

spec = importlib.util.spec_from_file_location('airbrake_error_matching', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BreakDetailLookupTests(unittest.TestCase):
    def test_preserves_existing_hash_for_lookup(self):
        candidates = module.build_lookup_hash_candidates('1e8c27dabaa1314d54385d32dc465c17')
        self.assertIn('1e8c27dabaa1314d54385d32dc465c17', candidates)

    def test_derives_a_fallback_hash_from_error_text(self):
        text = 'LLM output was not valid JSON'
        expected = hashlib.md5(text.lower().encode('utf-8')).hexdigest()
        candidates = module.build_lookup_hash_candidates('1e8c27dabaa1314d54385d32dc465c17', text)
        self.assertIn(expected, candidates)


if __name__ == '__main__':
    unittest.main()
