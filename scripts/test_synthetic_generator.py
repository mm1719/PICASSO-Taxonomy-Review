"""Offline checks using isolated temporary directories, never research data."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('generator', Path(__file__).with_name('generate_synthetic_demo.py'))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class GeneratorSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        generator.ROOT = Path(self.temporary.name)
        generator.PUBLIC = generator.ROOT / 'public'
        generator.DATA = generator.PUBLIC / 'data'

    def test_generation_is_complete_and_deterministic(self):
        generator.generate()
        before = {str(p.relative_to(generator.PUBLIC)): p.read_bytes()
                  for p in generator.PUBLIC.rglob('*') if p.is_file()}
        generator.generate()
        after = {str(p.relative_to(generator.PUBLIC)): p.read_bytes()
                 for p in generator.PUBLIC.rglob('*') if p.is_file()}
        self.assertEqual(before, after)
        self.assertEqual(set(before), generator.PUBLIC_FILES)

    def test_unknown_asset_is_preserved_and_blocks_generation(self):
        generator.DATA.mkdir(parents=True)
        unexpected = generator.DATA / 'unreviewed.csv'
        unexpected.write_text('do not publish or delete me')
        with self.assertRaisesRegex(ValueError, 'Unexpected public asset'):
            generator.generate()
        self.assertEqual(unexpected.read_text(), 'do not publish or delete me')
        self.assertEqual(list(generator.DATA.iterdir()), [unexpected])

    def test_unknown_directory_is_rejected(self):
        (generator.PUBLIC / 'unreviewed').mkdir(parents=True)
        with self.assertRaisesRegex(ValueError, 'Unexpected public directory'):
            generator.generate()

    def test_symlink_is_rejected_without_modifying_target(self):
        generator.DATA.mkdir(parents=True)
        target = generator.ROOT / 'private.csv'
        target.write_text('private sentinel')
        (generator.DATA / 'valid_class_candidates.csv').symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'Symlink is not permitted'):
            generator.generate()
        self.assertEqual(target.read_text(), 'private sentinel')

    def test_missing_asset_blocks_check(self):
        generator.generate()
        (generator.PUBLIC / 'samples/valid-1.svg').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing synthetic assets'):
            generator.check_generated_data()

    def test_modified_payload_blocks_check(self):
        generator.generate()
        (generator.DATA / 'taxonomy_tree.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            generator.check_generated_data()


if __name__ == '__main__':
    unittest.main()
