import numpy as np
from PIL import Image
from backend.read_log import SonarLogResult

class SonarImageGenerator:
    """
    Utility for generating waterfall images from raw sonar acoustic data.
    Normalizes 16-bit acoustic signals into viewable 8-bit images.
    """
    
    @staticmethod
    def _normalize_channel(samples: list) -> np.ndarray:
        """
        Converts a list of pings (raw acoustic data) into a normalized 8-bit numpy array.
        Applies 99th percentile clipping to handle acoustic outliers and brighten the image.
        """
        if not samples:
            return np.zeros((1, 1), dtype=np.uint8)
            
        # Convert to numpy array (pings x samples_per_ping)
        arr = np.array(samples, dtype=np.float32)
        
        # Handle empty or zero arrays
        if arr.size == 0 or np.max(arr) == 0:
            return np.zeros(arr.shape, dtype=np.uint8)
            
        # Clip at the 99th percentile to prevent a few bright spots from darkening the whole image
        p99 = np.percentile(arr, 99)
        if p99 > 0:
            arr = np.clip(arr, 0, p99)
            
        # Normalize to 0-255
        arr_normalized = (arr / p99) * 255.0
        return arr_normalized.astype(np.uint8)

    @classmethod
    def generate_waterfall(cls, sonar_result: SonarLogResult) -> Image.Image:
        """
        Generates a combined swath waterfall image with the Port channel on the left
        and the Starboard channel on the right. Nadir (the towfish) is in the center.
        """
        port_arr = cls._normalize_channel(sonar_result.port_samples)
        stbd_arr = cls._normalize_channel(sonar_result.starboard_samples)
        
        # Port image needs to be flipped horizontally so the center (first sample) is on the right
        # Starboard center (first sample) is naturally on the left
        if port_arr.size > 1:
            port_arr = np.fliplr(port_arr)
            
        # Ensure both arrays have the same number of rows (pings)
        min_rows = min(port_arr.shape[0], stbd_arr.shape[0])
        
        if min_rows > 0:
            port_arr = port_arr[:min_rows, :]
            stbd_arr = stbd_arr[:min_rows, :]
            
            # Concatenate horizontally
            swath_arr = np.hstack((port_arr, stbd_arr))
        else:
            # Fallback if there is a mismatch or empty data
            swath_arr = np.zeros((100, 100), dtype=np.uint8)
            
        # Convert to PIL Image
        # Since it's a single channel, it will be grayscale ('L' mode)
        img = Image.fromarray(swath_arr, mode='L')
        return img
