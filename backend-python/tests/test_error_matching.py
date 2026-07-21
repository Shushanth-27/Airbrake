import hashlib
import importlib.util
import pathlib
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / 'ai' / 'error_matching.py'
KNOWLEDGE_BASE_PATH = ROOT / 'ai' / 'knowledge_base.py'

spec = importlib.util.spec_from_file_location('airbrake_error_matching', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

knowledge_base_spec = importlib.util.spec_from_file_location('airbrake_knowledge_base', KNOWLEDGE_BASE_PATH)
knowledge_base = importlib.util.module_from_spec(knowledge_base_spec)
knowledge_base_spec.loader.exec_module(knowledge_base)


class ErrorMatchingTests(unittest.TestCase):
    def test_normalizes_project_names_for_matching(self):
        self.assertEqual(module.normalize_project_name('My_Project'), 'my project')
        self.assertEqual(module.normalize_project_name(' My Project  '), 'my project')

    def test_derives_stable_hash_from_normalized_error_text(self):
        detail = 'Traceback\n  File "x.py"\nValueError: Boom!'
        self.assertEqual(
            module.derive_error_hash(detail, None),
            hashlib.md5(b'valueerror').hexdigest(),
        )

    def test_builds_hash_candidates_for_error_lookup(self):
        detail = 'Traceback\n  File "x.py"\nValueError: Boom!'
        candidates = module.build_error_hash_candidates('ValueError: Boom!', detail)
        self.assertIn(module.derive_error_hash('ValueError: Boom!', detail), candidates)
        self.assertIn(hashlib.md5('Traceback\n  File "x.py"\nValueError: Boom!'.encode('utf-8')).hexdigest(), candidates)

    def test_reuses_existing_solution_for_duplicate_text(self):
        mock_query = mock.patch.object(knowledge_base, 'query', return_value=[{'id': 'sol-1', 'solution': 'Use retry logic', 'usage_count': 2, 'confidence_score': 54.0, 'version': 1}])
        mock_execute = mock.patch.object(knowledge_base, 'execute_returning', return_value={'id': 'sol-1', 'duplicate': True})
        mock_embedding = mock.patch('ai.embeddings.create_embedding', return_value=[0.1] * 1024)
        with mock_query as query_mock, mock_execute as execute_mock, mock_embedding:
            result = knowledge_base.insert_solution('hash-1', 'Use retry logic', created_by='tester', project_name='Test Project')
        self.assertTrue(result['duplicate'])
        self.assertEqual(execute_mock.call_count, 0)
        self.assertGreaterEqual(query_mock.call_count, 2)

    def test_classifies_high_similarity_as_duplicate(self):
        decision = knowledge_base.classify_duplicate_solution(0.97, None)
        self.assertTrue(decision['is_duplicate'])
        self.assertEqual(decision['decision'], 'duplicate')

    def test_detects_duplicate_prompt_for_similar_solution(self):
        with mock.patch('ai.embeddings.create_embedding', return_value=[0.1] * 1024), mock.patch.object(knowledge_base, 'query_similar', return_value=[{'id': 'sol-2', 'score': 0.98, 'metadata': {'solution_id': 'sol-2', 'error_hash': 'hash-1'}}]), mock.patch.object(knowledge_base, '_find_solution', return_value={'id': 'sol-2', 'solution': 'Use retry logic', 'created_by': 'tester', 'version': 2, 'confidence_score': 0.98, 'usage_count': 3}):
            result = knowledge_base.detect_duplicate_solution('Use retry logic', 'hash-1', 'Test Project')
        self.assertTrue(result['is_duplicate'])
        self.assertTrue(result['duplicate_prompt'])


if __name__ == '__main__':
    unittest.main()
