from __future__ import annotations

from typing import Any

from PIL import Image


def image_watermark_analysis(image: Image.Image) -> dict[str, Any]:
  """Detect visible generator watermarks before trusting an image classifier."""
  width, height = image.size
  if width < 120 or height < 120:
    return {"detected": False, "matches": []}

  crop_left = int(width * 0.65)
  crop_top = int(height * 0.65)
  crop = image.crop((crop_left, crop_top, width, height))
  pixels = crop.load()
  crop_width, crop_height = crop.size
  mask: set[tuple[int, int]] = set()

  for y in range(crop_height):
    for x in range(crop_width):
      red, green, blue = pixels[x, y]
      bright = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
      saturation_proxy = max(red, green, blue) - min(red, green, blue)
      if bright >= 185 and saturation_proxy <= 45:
        mask.add((x, y))

  min_dim = min(width, height)
  min_size = max(10, int(min_dim * 0.012))
  max_size = max(36, int(min_dim * 0.09))
  min_area = max(55, int((min_dim * 0.012) ** 2 * 0.35))
  max_area = max(1600, int((min_dim * 0.09) ** 2 * 0.75))
  matches: list[dict[str, Any]] = []

  while mask:
    start = mask.pop()
    stack = [start]
    component = [start]

    while stack:
      point_x, point_y = stack.pop()
      for neighbor in (
        (point_x + 1, point_y),
        (point_x - 1, point_y),
        (point_x, point_y + 1),
        (point_x, point_y - 1),
      ):
        if neighbor in mask:
          mask.remove(neighbor)
          stack.append(neighbor)
          component.append(neighbor)

    area = len(component)
    if area < min_area or area > max_area:
      continue

    xs = [point[0] for point in component]
    ys = [point[1] for point in component]
    bbox_width = max(xs) - min(xs) + 1
    bbox_height = max(ys) - min(ys) + 1
    if not (min_size <= bbox_width <= max_size and min_size <= bbox_height <= max_size):
      continue

    aspect_ratio = bbox_width / bbox_height
    fill_ratio = area / (bbox_width * bbox_height)
    center_x = crop_left + ((min(xs) + max(xs)) / 2)
    center_y = crop_top + ((min(ys) + max(ys)) / 2)
    in_watermark_zone = center_x >= width * 0.78 and center_y >= height * 0.78
    sparkle_like_shape = 0.55 <= aspect_ratio <= 1.8 and 0.08 <= fill_ratio <= 0.45

    if in_watermark_zone and sparkle_like_shape:
      matches.append(
        {
          "label": "Gemini-style sparkle watermark",
          "bbox": [
            int(crop_left + min(xs)),
            int(crop_top + min(ys)),
            int(crop_left + max(xs)),
            int(crop_top + max(ys)),
          ],
          "area": area,
          "fill_ratio": round(float(fill_ratio), 4),
        }
      )

  return {"detected": bool(matches), "matches": matches}
