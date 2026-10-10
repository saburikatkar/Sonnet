import unittest
import numpy as np
from PIL import Image
from backend.read_log import SonarLogResult
from backend.image_generator import SonarImageGenerator

class TestImageGenerator(unittest.TestCase):
    def test_normalize_channel_empty(self):
        arr = SonarImageGenerator._normalize_channel([])
        self.assertEqual(arr.shape, (1, 1))
        
    def test_normalize_channel_normal(self):
        # Create mock 16-bit data with some very high outlier pixels
        raw_data = [
            [10, 20, 30],
            [100, 200, 300],
            [1000, 2000, 65535]  # The 65535 is an outlier
        ]
        
        normalized = SonarImageGenerator._normalize_channel(raw_data)
        self.assertEqual(normalized.shape, (3, 3))
        self.assertEqual(normalized.dtype, np.uint8)
        
        # The outlier should be clipped and hit 255
        self.assertEqual(normalized[2, 2], 255)
        
    def test_generate_waterfall(self):
        # Mock Sonar Result
        result = SonarLogResult(format="MOCK", file_path="mock.xtf")
        # Port data: 2 pings, 4 samples each
        result.port_samples = [
            [10, 20, 30, 40],
            [15, 25, 35, 45]
        ]
        # Starboard data: 2 pings, 4 samples each
        result.starboard_samples = [
            [100, 200, 300, 400],
            [150, 250, 350, 450]
        ]
        
        img = SonarImageGenerator.generate_waterfall(result)
        self.assertIsInstance(img, Image.Image)
        self.assertEqual(img.mode, 'L')
        # Total width = 4 (port) + 4 (stbd) = 8
        self.assertEqual(img.size, (8, 2))  # (width, height)
        
if __name__ == '__main__':
    unittest.main()
