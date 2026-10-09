import unittest
import numpy as np
from image_tiler import extract_tiles

class TestImageTiler(unittest.TestCase):

    def test_invalid_dimensions(self):
        img = np.zeros((100, 100))
        with self.assertRaises(ValueError):
            extract_tiles(img, 0, 50)
        with self.assertRaises(ValueError):
            extract_tiles(img, 50, -10)

    def test_invalid_overlaps(self):
        img = np.zeros((100, 100))
        with self.assertRaises(ValueError):
            extract_tiles(img, 50, 50, overlap_x=-1)
        with self.assertRaises(ValueError):
            extract_tiles(img, 50, 50, overlap_x=50) # infinite loop check
        with self.assertRaises(ValueError):
            extract_tiles(img, 50, 50, overlap_y=60)

    def test_mutation_prevention(self):
        img = np.zeros((100, 100))
        tiles = extract_tiles(img, 50, 50)
        tile_data = tiles[0]['tile']
        tile_data[0, 0] = 255
        self.assertEqual(img[0, 0], 0)

    def test_exact_multiple(self):
        img = np.zeros((100, 100))
        tiles = extract_tiles(img, 50, 50, overlap_x=0, overlap_y=0)
        self.assertEqual(len(tiles), 4)

        expected_coords = [(0, 0), (50, 0), (0, 50), (50, 50)]
        actual_coords = [(t['x'], t['y']) for t in tiles]
        self.assertEqual(actual_coords, expected_coords)

        for t in tiles:
            self.assertEqual(t['source_width'], 50)
            self.assertEqual(t['source_height'], 50)
            self.assertEqual(t['tile'].shape, (50, 50))

    def test_overlap(self):
        img = np.zeros((100, 100))
        tiles = extract_tiles(img, 50, 50, overlap_x=25, overlap_y=25)
        # stride is 25. 100-50 = 50. 0, 25, 50. 3 positions. Total 9 tiles.
        self.assertEqual(len(tiles), 9)
        self.assertEqual(tiles[-1]['x'], 50)
        self.assertEqual(tiles[-1]['y'], 50)

    def test_boundary_snapping(self):
        # A 105 x 105 image with 50x50 tiles and zero overlap includes a final tile at (55, 55)
        img = np.zeros((105, 105))
        tiles = extract_tiles(img, 50, 50, overlap_x=0, overlap_y=0)

        # x coords should be 0, 50, 55
        # y coords should be 0, 50, 55
        # total 3x3 = 9 tiles
        self.assertEqual(len(tiles), 9)

        coords = [(t['x'], t['y']) for t in tiles]
        self.assertIn((55, 55), coords)

        final_tile = next(t for t in tiles if t['x'] == 55 and t['y'] == 55)
        self.assertEqual(final_tile['source_width'], 50)
        self.assertEqual(final_tile['source_height'], 50)

        # Tile that spans x from 0 to 50, y from 55 to 105
        edge_tile_y = next(t for t in tiles if t['x'] == 0 and t['y'] == 55)
        self.assertEqual(edge_tile_y['source_height'], 50)

    def test_image_smaller_than_tile(self):
        # A 30 x 30 image produces one padded 50 x 50 tile, with metadata recording the original size
        img = np.ones((30, 30))
        tiles = extract_tiles(img, 50, 50)

        self.assertEqual(len(tiles), 1)
        t = tiles[0]

        self.assertEqual(t['x'], 0)
        self.assertEqual(t['y'], 0)
        self.assertEqual(t['original_width'], 30)
        self.assertEqual(t['original_height'], 30)
        self.assertEqual(t['source_width'], 30)
        self.assertEqual(t['source_height'], 30)
        self.assertEqual(t['tile'].shape, (50, 50))

        # Ensure padding is zeros
        self.assertEqual(t['tile'][0, 0], 1.0)
        self.assertEqual(t['tile'][49, 49], 0.0) # padded area

    def test_rgb_image(self):
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        img[:, :, 0] = 255 # red image

        tiles = extract_tiles(img, 50, 50)
        self.assertEqual(len(tiles), 4)
        self.assertEqual(tiles[0]['tile'].shape, (50, 50, 3))
        self.assertEqual(tiles[0]['tile'].dtype, np.uint8)
        self.assertEqual(tiles[0]['tile'][0, 0, 0], 255)
        self.assertEqual(tiles[0]['tile'][0, 0, 1], 0)

    def test_rgb_image_padding(self):
        img = np.ones((30, 30, 3), dtype=np.uint8) * 128
        tiles = extract_tiles(img, 50, 50)
        self.assertEqual(tiles[0]['tile'].shape, (50, 50, 3))
        self.assertEqual(tiles[0]['tile'][0, 0, 0], 128)
        self.assertEqual(tiles[0]['tile'][49, 49, 0], 0)

    def test_invalid_input_type(self):
        with self.assertRaises((ValueError, TypeError)):
            extract_tiles([1, 2, 3], 50, 50)

    def test_invalid_dimensionality(self):
        img_1d = np.zeros((100,))
        with self.assertRaises(ValueError):
            extract_tiles(img_1d, 50, 50)

        img_4d = np.zeros((100, 100, 3, 2))
        with self.assertRaises(ValueError):
            extract_tiles(img_4d, 50, 50)

    def test_empty_images(self):
        with self.assertRaises(ValueError):
            extract_tiles(np.zeros((0, 100)), 50, 50)
        with self.assertRaises(ValueError):
            extract_tiles(np.zeros((100, 0)), 50, 50)
        with self.assertRaises(ValueError):
            extract_tiles(np.zeros((100, 100, 0)), 50, 50)

if __name__ == '__main__':
    unittest.main()
