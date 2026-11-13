import unittest
from shared import message
class SharedTest(unittest.TestCase):
    def test_shared_contract(self):
        self.assertEqual(message(), "tide-ready")
