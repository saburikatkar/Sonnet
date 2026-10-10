import numpy as np
from typing import List, Dict, Any, Union

def extract_tiles(
    image: np.ndarray, 
    tile_width: int, 
    tile_height: int, 
    overlap_x: int = 0, 
    overlap_y: int = 0
) -> List[Dict[str, Any]]:
    """
    Extracts tiles from an image with a specified size and overlap.
    Handles boundaries by snapping the last tile to the edge if the image is larger than the tile size,
    or padding the image with zeros if it is smaller than the tile size.

    Args:
        image (np.ndarray): The input image array, either (H, W) or (H, W, C).
        tile_width (int): The width of each tile.
        tile_height (int): The height of each tile.
        overlap_x (int): The horizontal overlap between tiles.
        overlap_y (int): The vertical overlap between tiles.

    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing the tile array and its metadata.
    """
    if not isinstance(image, np.ndarray):
        raise TypeError("Input image must be a numpy ndarray.")

    if image.ndim not in (2, 3):
        raise ValueError("Input image must be a 2D or 3D array.")

    if image.shape[0] == 0 or image.shape[1] == 0:
        raise ValueError("Input image must have non-zero height and width.")

    if image.ndim == 3 and image.shape[2] == 0:
        raise ValueError("3D image must have at least one channel.")

    if tile_width <= 0 or tile_height <= 0:
        raise ValueError("Tile dimensions must be positive.")
    if overlap_x < 0 or overlap_y < 0:
        raise ValueError("Overlap must be non-negative.")
    if overlap_x >= tile_width or overlap_y >= tile_height:
        raise ValueError("Overlap must be less than the tile size to avoid infinite loops.")

    orig_h, orig_w = image.shape[:2]

    pad_h = max(0, tile_height - orig_h)
    pad_w = max(0, tile_width - orig_w)

    if pad_h > 0 or pad_w > 0:
        if image.ndim == 3:
            padded_image = np.pad(image, ((0, pad_h), (0, pad_w), (0, 0)), mode='constant')
        else:
            padded_image = np.pad(image, ((0, pad_h), (0, pad_w)), mode='constant')
    else:
        padded_image = image

    padded_h, padded_w = padded_image.shape[:2]

    stride_x = tile_width - overlap_x
    stride_y = tile_height - overlap_y

    # Calculate x coordinates
    x_coords = list(range(0, padded_w - tile_width + 1, stride_x))
    if x_coords and x_coords[-1] + tile_width < padded_w:
        x_coords.append(padded_w - tile_width)
    elif not x_coords:
        x_coords = [0]

    # Calculate y coordinates
    y_coords = list(range(0, padded_h - tile_height + 1, stride_y))
    if y_coords and y_coords[-1] + tile_height < padded_h:
        y_coords.append(padded_h - tile_height)
    elif not y_coords:
        y_coords = [0]

    # Remove duplicates in case stride exactly hit the edge but we snapped anyway
    x_coords = sorted(list(set(x_coords)))
    y_coords = sorted(list(set(y_coords)))

    tiles = []
    for y in y_coords:
        for x in x_coords:
            # Extract tile and copy to avoid mutating the original image if the tile is modified
            tile_data = padded_image[y:y+tile_height, x:x+tile_width].copy()

            # The actual area from the source image that this tile covers
            actual_w = max(0, min(tile_width, orig_w - x))
            actual_h = max(0, min(tile_height, orig_h - y))

            tiles.append({
                "tile": tile_data,
                "x": x,
                "y": y,
                "source_width": actual_w,
                "source_height": actual_h,
                "tile_width": tile_width,
                "tile_height": tile_height,
                "original_width": orig_w,
                "original_height": orig_h
            })

    return tiles
